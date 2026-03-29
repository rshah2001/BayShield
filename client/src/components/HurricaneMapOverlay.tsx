// ============================================================
// HurricaneMapOverlay
// Renders an animated hurricane vortex directly on top of the
// Google Map by positioning an absolutely-placed canvas over
// the map container and projecting lat/lng → pixel coordinates
// using the Maps Projection API on every animation frame.
// ============================================================
import { useRef, useEffect, useCallback } from 'react';

interface TrackPoint { lat: number; lng: number; }

interface HurricaneMapOverlayProps {
  map: google.maps.Map | null;
  track: TrackPoint[];
  category: number;
  stormType: string;
  windSpeedKph: number;
  radiusKm: number;
  isActive: boolean; // only animate when true
}

// Category → visual palette
const CAT: Record<number, { core: string; band: string; eye: string; glow: string; size: number }> = {
  0: { core: '#94a3b8', band: '#64748b', eye: '#e2e8f0', glow: 'rgba(148,163,184,0.25)', size: 0.30 },
  1: { core: '#22d3ee', band: '#0891b2', eye: '#cffafe', glow: 'rgba(34,211,238,0.30)', size: 0.38 },
  2: { core: '#a3e635', band: '#65a30d', eye: '#ecfccb', glow: 'rgba(163,230,53,0.32)', size: 0.46 },
  3: { core: '#facc15', band: '#ca8a04', eye: '#fef9c3', glow: 'rgba(250,204,21,0.38)', size: 0.56 },
  4: { core: '#f97316', band: '#c2410c', eye: '#ffedd5', glow: 'rgba(249,115,22,0.42)', size: 0.68 },
  5: { core: '#ef4444', band: '#991b1b', eye: '#fee2e2', glow: 'rgba(239,68,68,0.50)', size: 0.82 },
};

// Rough Tampa Bay land boundary check (lat > 27.5, lng > -82.6)
function isLand(pt: TrackPoint) { return pt.lat > 27.5 && pt.lng > -82.6; }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getPointOnTrack(track: TrackPoint[], progress: number): TrackPoint {
  if (track.length === 0) return { lat: 27.95, lng: -82.45 };
  if (track.length === 1) return track[0];
  const scaled = progress * (track.length - 1);
  const idx = Math.min(Math.floor(scaled), track.length - 2);
  const t = scaled - idx;
  return { lat: lerp(track[idx].lat, track[idx + 1].lat, t), lng: lerp(track[idx].lng, track[idx + 1].lng, t) };
}

export default function HurricaneMapOverlay({
  map,
  track,
  category,
  stormType,
  windSpeedKph,
  radiusKm,
  isActive,
}: HurricaneMapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const progressRef = useRef(0);
  const lastTsRef = useRef(0);

  // Inject canvas as a sibling of the map div
  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    // Create wrapper that sits exactly over the map
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;';
    mapDiv.style.position = 'relative';
    mapDiv.appendChild(container);
    containerRef.current = container;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      mapDiv.removeChild(container);
      containerRef.current = null;
      canvasRef.current = null;
    };
  }, [map]);

  // Convert lat/lng to canvas pixel using Maps projection
  const project = useCallback((pt: TrackPoint, w: number, h: number): { x: number; y: number } | null => {
    if (!map) return null;
    const proj = map.getProjection();
    if (!proj) return null;
    const bounds = map.getBounds();
    if (!bounds) return null;

    const worldPt = proj.fromLatLngToPoint(new window.google.maps.LatLng(pt.lat, pt.lng));
    const nwWorld = proj.fromLatLngToPoint(bounds.getNorthEast());
    const seWorld = proj.fromLatLngToPoint(bounds.getSouthWest());
    if (!worldPt || !nwWorld || !seWorld) return null;

    // World coordinates span
    const zoom = map.getZoom() ?? 10;
    const scale = Math.pow(2, zoom);

    const nwPx = { x: nwWorld.x * scale, y: nwWorld.y * scale };
    const sePx = { x: seWorld.x * scale, y: seWorld.y * scale };
    const ptPx = { x: worldPt.x * scale, y: worldPt.y * scale };

    const mapW = Math.abs(sePx.x - nwPx.x) || 1;
    const mapH = Math.abs(sePx.y - nwPx.y) || 1;

    return {
      x: ((ptPx.x - nwPx.x) / mapW) * w,
      y: ((ptPx.y - nwPx.y) / mapH) * h,
    };
  }, [map]);

  // Compute pixel radius from km using map scale
  const kmToPixels = useCallback((km: number, lat: number, w: number): number => {
    if (!map) return 60;
    const zoom = map.getZoom() ?? 10;
    // Meters per pixel at given lat and zoom
    const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
    const px = (km * 1000) / metersPerPx;
    // Clamp to reasonable screen range
    return Math.max(40, Math.min(w * 0.45, px));
  }, [map]);

  // Draw the vortex at pixel position cx,cy
  const drawVortex = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    baseR: number,
    time: number,
    effectiveCat: number,
    landDecay: number,
  ) => {
    const cfg = CAT[effectiveCat] ?? CAT[0];
    const eyeR = baseR * 0.16;
    const rotSpeed = stormType === 'tornado' ? 5 : (1.2 + (effectiveCat - 1) * 0.25);

    // Outer atmospheric glow
    const outerGlow = ctx.createRadialGradient(cx, cy, eyeR, cx, cy, baseR * 1.8);
    outerGlow.addColorStop(0, cfg.glow);
    outerGlow.addColorStop(0.6, cfg.glow.replace(/[\d.]+\)$/, '0.08)'));
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Spiral rain bands (6 arms)
    for (let band = 0; band < 6; band++) {
      const offset = (band / 6) * Math.PI * 2;
      ctx.beginPath();
      for (let s = 0; s <= 80; s++) {
        const t = s / 80;
        const r = eyeR + (baseR - eyeR) * t;
        const angle = offset - time * rotSpeed - t * Math.PI * 3.8;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.88;
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const alpha = Math.round(0.6 * landDecay * 255).toString(16).padStart(2, '0');
      ctx.strokeStyle = cfg.band + alpha;
      ctx.lineWidth = Math.max(1.5, baseR * 0.042);
      ctx.stroke();
    }

    // Cloud disc
    const disc = ctx.createRadialGradient(cx, cy, eyeR, cx, cy, baseR);
    disc.addColorStop(0, 'transparent');
    disc.addColorStop(0.35, cfg.core + '18');
    disc.addColorStop(0.75, cfg.core + '28');
    disc.addColorStop(1, 'transparent');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.ellipse(cx, cy, baseR, baseR * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye wall dense ring
    const eyeWall = ctx.createRadialGradient(cx, cy, eyeR * 0.65, cx, cy, eyeR * 1.6);
    eyeWall.addColorStop(0, 'transparent');
    eyeWall.addColorStop(0.5, cfg.core + '55');
    eyeWall.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeWall;
    ctx.beginPath();
    ctx.arc(cx, cy, eyeR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Eye (calm center)
    const eye = ctx.createRadialGradient(cx, cy, 0, cx, cy, eyeR);
    eye.addColorStop(0, cfg.eye + 'cc');
    eye.addColorStop(0.55, cfg.eye + '44');
    eye.addColorStop(1, 'transparent');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(cx, cy, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Rotation particles
    const numP = Math.floor(10 + effectiveCat * 5);
    for (let p = 0; p < numP; p++) {
      const pAngle = (p / numP) * Math.PI * 2 - time * rotSpeed * 1.15;
      const pR = eyeR * 1.4 + (baseR - eyeR * 1.4) * (0.15 + (p % 3) * 0.28);
      const px = cx + Math.cos(pAngle) * pR;
      const py = cy + Math.sin(pAngle) * pR * 0.88;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, baseR * 0.016), 0, Math.PI * 2);
      ctx.fillStyle = cfg.core + 'aa';
      ctx.fill();
    }

    // Landfall rain streaks
    if (landDecay < 0.88) {
      const streaks = Math.floor((1 - landDecay) * 25);
      for (let s = 0; s < streaks; s++) {
        const a = Math.random() * Math.PI * 2;
        const d = eyeR + Math.random() * baseR * 1.1;
        const sx = cx + Math.cos(a) * d;
        const sy = cy + Math.sin(a) * d;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 2, sy + 7);
        ctx.strokeStyle = 'rgba(147,197,253,0.28)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }, [stormType]);

  // Animation loop
  useEffect(() => {
    if (!isActive || !map) return;

    const animate = (ts: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) { rafRef.current = requestAnimationFrame(animate); return; }

      const dt = Math.min((ts - (lastTsRef.current || ts)) / 1000, 0.05);
      lastTsRef.current = ts;
      timeRef.current += dt * 1.1;

      // Advance along track (loop)
      const trackLen = Math.max(track.length - 1, 1);
      progressRef.current = (progressRef.current + dt * 0.035 / trackLen) % 1;

      // Resize canvas to match container
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(animate); return; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (track.length < 1) { rafRef.current = requestAnimationFrame(animate); return; }

      const pos = getPointOnTrack(track, progressRef.current);
      const pixel = project(pos, w, h);
      if (!pixel) { rafRef.current = requestAnimationFrame(animate); return; }

      const onLand = isLand(pos);
      const landDecay = onLand ? Math.max(0.32, 1 - (progressRef.current - 0.55) * 1.8) : 1;
      const effectiveCat = Math.max(0, Math.round(category * landDecay));
      const baseR = kmToPixels(radiusKm, pos.lat, w) * (CAT[effectiveCat]?.size ?? 0.5);

      drawVortex(ctx, pixel.x, pixel.y, baseR, timeRef.current, effectiveCat, landDecay);

      // Intensity label
      const cfg = CAT[effectiveCat] ?? CAT[0];
      const label = onLand && landDecay < 0.88 ? '⚡ WEAKENING' : `Cat ${effectiveCat} · ${Math.round(windSpeedKph * landDecay)} km/h`;
      ctx.font = `bold 11px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = cfg.core;
      ctx.fillText(label, pixel.x, pixel.y + baseR + 16);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, map, track, category, radiusKm, windSpeedKph, project, kmToPixels, drawVortex]);

  // Reset when track changes
  useEffect(() => {
    progressRef.current = 0;
    timeRef.current = 0;
  }, [track]);

  return null; // renders into the map DOM directly
}
