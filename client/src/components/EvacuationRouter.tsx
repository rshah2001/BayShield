// ============================================================
// BAYSHIELD -- Evacuation Router
// Design: Apple-level dark UI. Real-time GPS routing to shelters.
// Uses Google Maps Directions API with live traffic.
// Ranks routes by safety score (avoids flood zones, surge areas).
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { RESOURCES, VULNERABILITY_ZONES } from '@/lib/stormData';
import { cn } from '@/lib/utils';
import {
  Navigation, MapPin, Clock, AlertTriangle, CheckCircle2,
  RefreshCw, ChevronRight, Shield, Zap, Car, Route
} from 'lucide-react';

// ── Shelter destinations ──────────────────────────────────────
const SHELTERS = RESOURCES.filter(r => r.type === 'shelter');

// ── Flood zone polygons (approximate bounding boxes for Tampa Bay surge zones) ──
// Used to compute a "flood zone penalty" for each route segment
const FLOOD_ZONE_BOUNDS = VULNERABILITY_ZONES
  .filter(z => z.floodZone === 'VE' || z.floodZone === 'AE')
  .map(z => ({
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    radius: z.floodZone === 'VE' ? 3000 : 2000, // meters
    penalty: z.floodZone === 'VE' ? 30 : 15,
    riskScore: z.riskScore,
  }));

// ── Types ─────────────────────────────────────────────────────
export interface EvacRoute {
  id: string;
  shelter: typeof SHELTERS[0];
  distance: string;
  duration: string;
  durationValue: number; // seconds
  distanceValue: number; // meters
  safetyScore: number; // 0-100, higher = safer
  floodZonesCrossed: string[];
  trafficCondition: 'clear' | 'moderate' | 'heavy' | 'standstill';
  steps: string[];
  polyline?: google.maps.DirectionsRoute;
  recommended: boolean;
  warnings: string[];
  directionsResult?: google.maps.DirectionsResult;
}

interface EvacuationRouterProps {
  map: google.maps.Map | null;
  onRouteSelected?: (route: EvacRoute | null) => void;
}

// ── Helpers ───────────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeFloodPenalty(steps: google.maps.DirectionsStep[]): { penalty: number; zones: string[] } {
  let penalty = 0;
  const zones: string[] = [];
  for (const step of steps) {
    const lat = step.start_location.lat();
    const lng = step.start_location.lng();
    for (const zone of FLOOD_ZONE_BOUNDS) {
      const dist = haversineDistance(lat, lng, zone.lat, zone.lng);
      if (dist < zone.radius) {
        penalty += zone.penalty;
        if (!zones.includes(zone.name)) zones.push(zone.name);
      }
    }
  }
  return { penalty, zones };
}

function trafficLabel(ratio: number): EvacRoute['trafficCondition'] {
  if (ratio < 1.15) return 'clear';
  if (ratio < 1.4) return 'moderate';
  if (ratio < 1.8) return 'heavy';
  return 'standstill';
}

const TRAFFIC_CONFIG: Record<EvacRoute['trafficCondition'], { label: string; color: string; bg: string }> = {
  clear:      { label: 'Clear',      color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  moderate:   { label: 'Moderate',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  heavy:      { label: 'Heavy',      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  standstill: { label: 'Standstill', color: '#ef4444', bg: 'rgba(239,68,68,0.18)' },
};

function SafetyBar({ score }: { score: number }) {
  const color = score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function EvacuationRouter({ map, onRouteSelected }: EvacuationRouterProps) {
  const [userLocation, setUserLocation] = useState<google.maps.LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routes, setRoutes] = useState<EvacRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init Google Maps services when map is ready ──
  useEffect(() => {
    if (!map || !window.google) return;
    directionsServiceRef.current = new google.maps.DirectionsService();
    geocoderRef.current = new google.maps.Geocoder();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3b82f6',
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
  }, [map]);

  // ── Compute all routes to all shelters ──
  const computeRoutes = useCallback(async (origin: google.maps.LatLng) => {
    if (!directionsServiceRef.current || !window.google) return;
    setIsRouting(true);

    const results: EvacRoute[] = [];

    for (const shelter of SHELTERS) {
      const destination = new google.maps.LatLng(shelter.lat, shelter.lng);
      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsServiceRef.current!.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
              drivingOptions: {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS,
              },
              provideRouteAlternatives: false,
              avoidHighways: false,
              avoidTolls: false,
            },
            (res, status) => {
              if (status === 'OK' && res) resolve(res);
              else reject(new Error(status));
            }
          );
        });

        const leg = result.routes[0].legs[0];
        const durationNormal = leg.duration?.value ?? 0;
        const durationTraffic = leg.duration_in_traffic?.value ?? durationNormal;
        const trafficRatio = durationTraffic / Math.max(durationNormal, 1);
        const traffic = trafficLabel(trafficRatio);

        const { penalty, zones } = computeFloodPenalty(leg.steps);

        // Safety score: start at 100, subtract flood penalty + traffic penalty
        const trafficPenalty = traffic === 'clear' ? 0 : traffic === 'moderate' ? 5 : traffic === 'heavy' ? 15 : 25;
        const capacityPenalty = shelter.status === 'full' ? 40 : shelter.status === 'filling' ? 10 : 0;
        const safetyScore = Math.max(0, Math.min(100, 100 - penalty - trafficPenalty - capacityPenalty));

        // Extract turn-by-turn steps
        const steps = leg.steps.slice(0, 6).map(s => s.instructions.replace(/<[^>]*>/g, ''));

        const warnings: string[] = [];
        if (zones.length > 0) warnings.push(`Passes through ${zones.length} flood zone(s): ${zones.slice(0, 2).join(', ')}`);
        if (traffic === 'heavy') warnings.push('Heavy evacuation traffic on this route');
        if (traffic === 'standstill') warnings.push('Traffic standstill -- consider alternate route');
        if (shelter.status === 'filling') warnings.push(`Shelter at ${Math.round((shelter.currentOccupancy / shelter.capacity) * 100)}% capacity`);
        if (shelter.status === 'full') warnings.push('Shelter at full capacity -- seek alternate');

        results.push({
          id: shelter.id,
          shelter,
          distance: leg.distance?.text ?? '--',
          duration: durationTraffic > durationNormal
            ? `${leg.duration_in_traffic?.text ?? leg.duration?.text} (with traffic)`
            : leg.duration?.text ?? '--',
          durationValue: durationTraffic,
          distanceValue: leg.distance?.value ?? 0,
          safetyScore,
          floodZonesCrossed: zones,
          trafficCondition: traffic,
          steps,
          recommended: false,
          warnings,
          directionsResult: result,
        });
      } catch {
        // Skip shelters that can't be routed to
      }
    }

    // Sort by safety score desc, then duration asc
    results.sort((a, b) => {
      if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
      return a.durationValue - b.durationValue;
    });

    // Mark the top result as recommended
    if (results.length > 0) results[0].recommended = true;

    setRoutes(results);
    setLastUpdated(new Date());
    setIsRouting(false);

    // Auto-select the recommended route
    if (results.length > 0) {
      setSelectedRouteId(results[0].id);
      renderRouteOnMap(results[0]);
    }
  }, []);

  // ── Render a route on the map ──
  const renderRouteOnMap = useCallback((route: EvacRoute) => {
    if (!directionsRendererRef.current || !route.directionsResult) return;
    directionsRendererRef.current.setDirections(route.directionsResult);
    directionsRendererRef.current.setOptions({
      polylineOptions: {
        strokeColor: route.safetyScore >= 75 ? '#34d399' : route.safetyScore >= 50 ? '#fbbf24' : '#f87171',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });
    onRouteSelected?.(route);
  }, [onRouteSelected]);

  // ── Get user location ──
  const getLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        setUserLocation(loc);
        setIsLocating(false);

        // Drop a user marker on the map
        if (map) {
          userMarkerRef.current?.setMap(null);
          userMarkerRef.current = new google.maps.Marker({
            position: loc,
            map,
            title: 'Your Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          map.panTo(loc);
          map.setZoom(11);
        }

        computeRoutes(loc);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access denied. Enter your address below.');
          setShowAddressInput(true);
        } else {
          setLocationError('Could not get your location. Enter your address below.');
          setShowAddressInput(true);
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [map, computeRoutes]);

  // ── Geocode manual address ──
  const geocodeAddress = useCallback(async () => {
    if (!geocoderRef.current || !manualAddress.trim()) return;
    setIsLocating(true);
    setLocationError(null);
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode(
          { address: manualAddress + ', Tampa Bay, FL', region: 'us' },
          (res, status) => {
            if (status === 'OK' && res) resolve(res);
            else reject(new Error(status));
          }
        );
      });
      const loc = result[0].geometry.location;
      setUserLocation(loc);
      setIsLocating(false);
      setShowAddressInput(false);

      if (map) {
        userMarkerRef.current?.setMap(null);
        userMarkerRef.current = new google.maps.Marker({
          position: loc,
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        map.panTo(loc);
        map.setZoom(11);
      }
      computeRoutes(loc);
    } catch {
      setLocationError('Address not found. Try a more specific address.');
      setIsLocating(false);
    }
  }, [manualAddress, map, computeRoutes]);

  // ── Auto-refresh routes every 2 minutes ──
  useEffect(() => {
    if (!userLocation) return;
    refreshTimerRef.current = setInterval(() => {
      computeRoutes(userLocation);
    }, 2 * 60 * 1000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [userLocation, computeRoutes]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      directionsRendererRef.current?.setMap(null);
      userMarkerRef.current?.setMap(null);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  const selectedRoute = routes.find(r => r.id === selectedRouteId) ?? null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Route className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-white">Evacuation Routing</span>
          </div>
          {lastUpdated && (
            <button
              onClick={() => userLocation && computeRoutes(userLocation)}
              disabled={isRouting}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', isRouting && 'animate-spin')} />
              {isRouting ? 'Updating...' : `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Real-time routes to evacuation shelters -- live traffic + flood zone avoidance
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Location Panel */}
        {!userLocation ? (
          <div className="space-y-3">
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Navigation className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Find Your Evacuation Route</p>
              <p className="text-[11px] text-slate-400 mb-4">
                Share your location to get real-time routes to the nearest shelter, ranked by safety score and live traffic.
              </p>
              <button
                onClick={getLocation}
                disabled={isLocating}
                className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLocating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Locating...</>
                ) : (
                  <><Navigation className="w-4 h-4" /> Use My Location</>
                )}
              </button>
            </div>

            {locationError && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-[11px] text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {locationError}
                </p>
              </div>
            )}

            {showAddressInput && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={e => setManualAddress(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && geocodeAddress()}
                    placeholder="Enter your address..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={geocodeAddress}
                    disabled={isLocating || !manualAddress.trim()}
                    className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isLocating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">e.g. "123 Main St, Tampa" or "Clearwater Beach"</p>
              </div>
            )}

            {!showAddressInput && !locationError && (
              <button
                onClick={() => setShowAddressInput(true)}
                className="w-full text-[11px] text-slate-400 hover:text-white transition-colors py-1"
              >
                Enter address manually instead
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Location confirmed */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-300 flex-1 truncate">
                Location confirmed -- routing to {SHELTERS.length} shelters
              </span>
              <button
                onClick={() => {
                  setUserLocation(null);
                  setRoutes([]);
                  setSelectedRouteId(null);
                  directionsRendererRef.current?.setDirections({ routes: [] } as never);
                  userMarkerRef.current?.setMap(null);
                  onRouteSelected?.(null);
                }}
                className="text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                Change
              </button>
            </div>

            {/* Loading state */}
            {isRouting && routes.length === 0 && (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                ))}
                <p className="text-[11px] text-slate-500 text-center">
                  Calculating routes with live traffic...
                </p>
              </div>
            )}

            {/* Route cards */}
            {routes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                    {routes.length} Routes Found
                  </span>
                  {isRouting && (
                    <span className="text-[10px] text-blue-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Refreshing
                    </span>
                  )}
                </div>

                {routes.map((route) => {
                  const isSelected = route.id === selectedRouteId;
                  const tc = TRAFFIC_CONFIG[route.trafficCondition];
                  return (
                    <button
                      key={route.id}
                      onClick={() => {
                        setSelectedRouteId(route.id);
                        renderRouteOnMap(route);
                      }}
                      className={cn(
                        'w-full text-left rounded-xl p-3 border transition-all duration-200',
                        isSelected
                          ? 'bg-blue-500/12 border-blue-500/40'
                          : 'bg-white/4 border-white/8 hover:bg-white/6 hover:border-white/15'
                      )}
                    >
                      {/* Route header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {route.recommended && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              RECOMMENDED
                            </span>
                          )}
                          <span className="text-xs font-semibold text-white">{route.shelter.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-300">{route.duration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-300">{route.distance}</span>
                        </div>
                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
                          style={{ background: tc.bg, color: tc.color }}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          {tc.label}
                        </div>
                      </div>

                      {/* Safety score */}
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500 font-mono uppercase">Safety Score</span>
                          <span className="text-[10px] font-mono" style={{
                            color: route.safetyScore >= 75 ? '#34d399' : route.safetyScore >= 50 ? '#fbbf24' : '#f87171'
                          }}>
                            {route.safetyScore >= 75 ? 'SAFE' : route.safetyScore >= 50 ? 'CAUTION' : 'RISK'}
                          </span>
                        </div>
                        <SafetyBar score={route.safetyScore} />
                      </div>

                      {/* Shelter capacity */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">
                          Capacity: {route.shelter.currentOccupancy.toLocaleString()} / {route.shelter.capacity.toLocaleString()}
                        </span>
                        <span className={cn(
                          'font-mono',
                          route.shelter.status === 'available' ? 'text-emerald-400' :
                          route.shelter.status === 'filling' ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {route.shelter.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Warnings */}
                      {route.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {route.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                              <span className="text-[10px] text-amber-300/80">{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Turn-by-turn for selected route */}
            {selectedRoute && selectedRoute.steps.length > 0 && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-semibold text-white">Turn-by-Turn Directions</span>
                  <span className="text-[10px] text-slate-500">to {selectedRoute.shelter.name}</span>
                </div>
                <div className="space-y-2">
                  {selectedRoute.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] text-blue-400 font-mono font-bold">{i + 1}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                  {selectedRoute.steps.length < selectedRoute.shelter.name.length && (
                    <p className="text-[10px] text-slate-500 pl-7">...and more steps on the map</p>
                  )}
                </div>

                {/* Supplies at destination */}
                {selectedRoute.shelter.supplies && (
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <p className="text-[10px] text-slate-500 mb-1.5 font-mono uppercase">Available at Shelter</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedRoute.shelter.supplies.map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/6 text-slate-300 border border-white/10">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flood zone info */}
            {selectedRoute && selectedRoute.floodZonesCrossed.length > 0 && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] font-semibold text-red-300">Flood Zone Warning</span>
                </div>
                <p className="text-[11px] text-red-300/80">
                  This route passes through {selectedRoute.floodZonesCrossed.length} flood zone(s):{' '}
                  <strong>{selectedRoute.floodZonesCrossed.join(', ')}</strong>.
                  Drive carefully and monitor water levels.
                </p>
              </div>
            )}

            {/* Auto-refresh notice */}
            <div className="text-center">
              <p className="text-[10px] text-slate-600">
                Routes auto-refresh every 2 minutes with live traffic data
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
