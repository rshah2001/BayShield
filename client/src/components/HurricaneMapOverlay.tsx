import { useRef, useEffect, useCallback } from 'react';

interface TrackPoint {
  lat: number;
  lng: number;
}

interface TrackSample {
  point: TrackPoint;
  visualEnergy: number;
  windScale: number;
  radiusScale: number;
  categoryValue: number;
}

interface HurricaneMapOverlayProps {
  map: google.maps.Map | null;
  track: TrackPoint[];
  category: number;
  stormType: string;
  windSpeedKph: number;
  radiusKm: number;
  isActive: boolean;
  isPaused?: boolean;
  movementSpeed?: number;
  resetKey?: number;
}

type DisasterVisual = 'hurricane' | 'tropical' | 'tornado' | 'flood' | 'winter';

const CAT: Record<number, { core: string; band: string; eye: string; glow: string; scale: number }> = {
  0: { core: '#94a3b8', band: '#64748b', eye: '#e2e8f0', glow: 'rgba(148,163,184,0.18)', scale: 0.34 },
  1: { core: '#22d3ee', band: '#0ea5e9', eye: '#cffafe', glow: 'rgba(34,211,238,0.22)', scale: 0.42 },
  2: { core: '#84cc16', band: '#65a30d', eye: '#ecfccb', glow: 'rgba(132,204,22,0.22)', scale: 0.5 },
  3: { core: '#facc15', band: '#f59e0b', eye: '#fef3c7', glow: 'rgba(250,204,21,0.24)', scale: 0.62 },
  4: { core: '#fb923c', band: '#f97316', eye: '#ffedd5', glow: 'rgba(251,146,60,0.26)', scale: 0.74 },
  5: { core: '#f87171', band: '#ef4444', eye: '#fee2e2', glow: 'rgba(248,113,113,0.3)', scale: 0.86 },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDisasterVisual(stormType: string): DisasterVisual {
  if (stormType === 'tornado') return 'tornado';
  if (stormType === 'flood') return 'flood';
  if (stormType === 'nor_easter') return 'winter';
  if (stormType === 'tropical_storm' || stormType === 'tropical_depression') return 'tropical';
  return 'hurricane';
}

function getPointOnTrack(track: TrackPoint[], progress: number): TrackPoint {
  if (track.length === 0) return { lat: 27.95, lng: -82.45 };
  if (track.length === 1) return track[0];
  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (track.length - 1);
  const index = Math.min(Math.floor(scaled), track.length - 2);
  const t = scaled - index;
  return {
    lat: lerp(track[index].lat, track[index + 1].lat, t),
    lng: lerp(track[index].lng, track[index + 1].lng, t),
  };
}

function isNearTampaLand(pt: TrackPoint) {
  return pt.lat > 27.6 && pt.lng > -82.9;
}

function buildTrackSamples(
  track: TrackPoint[],
  stormType: string,
  category: number,
  windSpeedKph: number,
): TrackSample[] {
  if (track.length === 0) {
    return [{
      point: { lat: 27.95, lng: -82.45 },
      visualEnergy: 0.5,
      windScale: 1,
      radiusScale: 1,
      categoryValue: category,
    }];
  }

  const divisor = Math.max(1, track.length - 1);

  return track.map((point, index) => {
    const progress = index / divisor;
    const nearLand = isNearTampaLand(point);

    if (stormType === 'hurricane') {
      const ramp = progress < 0.62 ? 0.78 + progress * 0.62 : 1.16 - (progress - 0.62) * 1.12;
      const landDecay = nearLand ? 0.92 - progress * 0.24 : 1;
      const energy = clamp(ramp * landDecay, 0.46, 1.12);
      return {
        point,
        visualEnergy: energy,
        windScale: energy,
        radiusScale: clamp(0.72 + energy * 0.44, 0.7, 1.18),
        categoryValue: clamp(Math.round(category * (0.68 + energy * 0.42)), 1, 5),
      };
    }

    if (stormType === 'tropical_storm' || stormType === 'tropical_depression') {
      const energy = clamp(0.64 + Math.sin(progress * Math.PI) * 0.42 + (nearLand ? -0.08 : 0.04), 0.45, 1.02);
      const catFromWind = clamp(Math.round((windSpeedKph * energy - 60) / 45), 1, 2);
      return {
        point,
        visualEnergy: energy,
        windScale: energy,
        radiusScale: clamp(0.82 + energy * 0.28, 0.76, 1.08),
        categoryValue: catFromWind,
      };
    }

    if (stormType === 'tornado') {
      const peak = 1 - Math.abs(progress - 0.55) / 0.55;
      const energy = clamp(0.42 + peak * 0.92, 0.38, 1.14);
      return {
        point,
        visualEnergy: energy,
        windScale: clamp(0.62 + energy * 0.52, 0.58, 1.2),
        radiusScale: clamp(0.65 + energy * 0.24, 0.62, 0.98),
        categoryValue: 0,
      };
    }

    if (stormType === 'flood') {
      const swell = progress < 0.7 ? 0.56 + progress * 0.7 : 1.05 - (progress - 0.7) * 0.45;
      const landBoost = nearLand ? 0.12 : 0;
      const energy = clamp(swell + landBoost, 0.48, 1.08);
      return {
        point,
        visualEnergy: energy,
        windScale: clamp(0.75 + energy * 0.18, 0.72, 1.02),
        radiusScale: clamp(0.82 + energy * 0.44, 0.84, 1.24),
        categoryValue: 0,
      };
    }

    const winterEnergy = clamp(0.58 + Math.sin(progress * Math.PI) * 0.26 + (nearLand ? 0.08 : 0), 0.52, 1);
    return {
      point,
      visualEnergy: winterEnergy,
      windScale: clamp(0.82 + winterEnergy * 0.16, 0.8, 1),
      radiusScale: clamp(0.9 + winterEnergy * 0.3, 0.92, 1.18),
      categoryValue: 0,
    };
  });
}

function getSampleOnTrack(
  samples: TrackSample[],
  progress: number,
): TrackSample {
  if (samples.length === 0) {
    return {
      point: { lat: 27.95, lng: -82.45 },
      visualEnergy: 0.5,
      windScale: 1,
      radiusScale: 1,
      categoryValue: 1,
    };
  }
  if (samples.length === 1) return samples[0];

  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (samples.length - 1);
  const index = Math.min(Math.floor(scaled), samples.length - 2);
  const t = scaled - index;
  const current = samples[index];
  const next = samples[index + 1];

  return {
    point: {
      lat: lerp(current.point.lat, next.point.lat, t),
      lng: lerp(current.point.lng, next.point.lng, t),
    },
    visualEnergy: lerp(current.visualEnergy, next.visualEnergy, t),
    windScale: lerp(current.windScale, next.windScale, t),
    radiusScale: lerp(current.radiusScale, next.radiusScale, t),
    categoryValue: lerp(current.categoryValue, next.categoryValue, t),
  };
}

export default function HurricaneMapOverlay({
  map,
  track,
  category,
  stormType,
  windSpeedKph,
  radiusKm,
  isActive,
  isPaused = false,
  movementSpeed = 1,
  resetKey = 0,
}: HurricaneMapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastTsRef = useRef(0);
  const progressRef = useRef(1);

  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    const container = document.createElement('div');
    container.style.cssText =
      'position:absolute;inset:0;pointer-events:none;z-index:10;overflow:hidden;';
    mapDiv.style.position = 'relative';
    mapDiv.appendChild(container);
    containerRef.current = container;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    return () => {
      cancelAnimationFrame(rafRef.current);
      mapDiv.removeChild(container);
      containerRef.current = null;
      canvasRef.current = null;
    };
  }, [map]);

  const project = useCallback(
    (pt: TrackPoint, w: number, h: number): { x: number; y: number } | null => {
      if (!map) return null;
      const projection = map.getProjection();
      const bounds = map.getBounds();
      if (!projection || !bounds) return null;

      const worldPt = projection.fromLatLngToPoint(new window.google.maps.LatLng(pt.lat, pt.lng));
      const northEast = projection.fromLatLngToPoint(bounds.getNorthEast());
      const southWest = projection.fromLatLngToPoint(bounds.getSouthWest());
      if (!worldPt || !northEast || !southWest) return null;

      const zoom = map.getZoom() ?? 8;
      const scale = 2 ** zoom;
      const left = southWest.x * scale;
      const right = northEast.x * scale;
      const top = northEast.y * scale;
      const bottom = southWest.y * scale;
      const x = worldPt.x * scale;
      const y = worldPt.y * scale;

      const spanX = Math.max(1, right - left);
      const spanY = Math.max(1, bottom - top);

      return {
        x: ((x - left) / spanX) * w,
        y: ((y - top) / spanY) * h,
      };
    },
    [map]
  );

  const kmToPixels = useCallback(
    (km: number, lat: number, width: number) => {
      if (!map) return 60;
      const zoom = map.getZoom() ?? 8;
      const metersPerPixel =
        (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
      const px = (km * 1000) / metersPerPixel;
      return clamp(px, 28, width * 0.38);
    },
    [map]
  );

  const drawHurricane = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      baseR: number,
      time: number,
      intensity: number
    ) => {
      const cfg = CAT[intensity] ?? CAT[0];
      const eyeR = baseR * 0.15;

      const glow = ctx.createRadialGradient(cx, cy, eyeR, cx, cy, baseR * 1.85);
      glow.addColorStop(0, cfg.glow);
      glow.addColorStop(0.55, cfg.glow.replace(/0\.\d+\)/, '0.06)'));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.85, 0, Math.PI * 2);
      ctx.fill();

      for (let arm = 0; arm < 5; arm += 1) {
        const offset = (arm / 5) * Math.PI * 2 + time * 1.1;
        ctx.beginPath();
        for (let step = 0; step <= 88; step += 1) {
          const t = step / 88;
          const radius = eyeR + (baseR - eyeR) * t;
          const angle = offset - t * Math.PI * 3.6;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius * 0.86;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${cfg.band}${Math.round(190).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = Math.max(1.5, baseR * 0.045);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.ellipse(cx, cy, baseR, baseR * 0.9, 0, 0, Math.PI * 2);
      const fill = ctx.createRadialGradient(cx, cy, eyeR * 0.5, cx, cy, baseR);
      fill.addColorStop(0, 'rgba(255,255,255,0)');
      fill.addColorStop(0.3, `${cfg.core}22`);
      fill.addColorStop(0.7, `${cfg.core}15`);
      fill.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, eyeR * 1.3, 0, Math.PI * 2);
      ctx.strokeStyle = `${cfg.eye}aa`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, eyeR, 0, Math.PI * 2);
      const eye = ctx.createRadialGradient(cx, cy, 0, cx, cy, eyeR);
      eye.addColorStop(0, `${cfg.eye}d8`);
      eye.addColorStop(0.7, `${cfg.eye}40`);
      eye.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = eye;
      ctx.fill();
    },
    []
  );

  const drawTropicalStorm = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      baseR: number,
      time: number
    ) => {
      const cfg = CAT[Math.max(1, Math.min(2, category))];

      const glow = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.8);
      glow.addColorStop(0, 'rgba(34,211,238,0.16)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      for (let ring = 0; ring < 4; ring += 1) {
        const pulse = 1 + Math.sin(time * 2.1 + ring) * 0.08;
        ctx.beginPath();
        ctx.ellipse(cx, cy, baseR * (0.44 + ring * 0.18) * pulse, baseR * (0.24 + ring * 0.1), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `${cfg.band}88`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      for (let i = 0; i < 70; i += 1) {
        const angle = (i / 70) * Math.PI * 2 + time * 0.55;
        const radius = baseR * (0.32 + (i % 7) * 0.1);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.72;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 12);
        ctx.strokeStyle = 'rgba(186,230,253,0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    [category]
  );

  const drawTornado = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      baseR: number,
      time: number
    ) => {
      const topY = cy - baseR * 1.9;
      const groundY = cy + baseR * 0.08;
      const twist = Math.sin(time * 3.2) * 10;

      const glow = ctx.createRadialGradient(cx, cy - baseR * 0.6, 0, cx, cy - baseR * 0.4, baseR * 2.2);
      glow.addColorStop(0, 'rgba(226,232,240,0.14)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy - baseR * 0.55, baseR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Cloud cap above the funnel
      ctx.beginPath();
      ctx.ellipse(cx, topY + baseR * 0.26, baseR * 1.18, baseR * 0.42, 0.06, 0, Math.PI * 2);
      const cloud = ctx.createLinearGradient(cx, topY - baseR * 0.1, cx, topY + baseR * 0.6);
      cloud.addColorStop(0, 'rgba(241,245,249,0.16)');
      cloud.addColorStop(1, 'rgba(100,116,139,0.28)');
      ctx.fillStyle = cloud;
      ctx.fill();

      ctx.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const t = step / 48;
        const y = topY + (groundY - topY) * t;
        const funnelWidth = lerp(baseR * 0.86, baseR * 0.12, t);
        const offset = Math.sin(time * 4 + t * 8.5) * (baseR * 0.08);
        const x = cx - funnelWidth + offset + twist * (1 - t);
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let step = 48; step >= 0; step -= 1) {
        const t = step / 48;
        const y = topY + (groundY - topY) * t;
        const funnelWidth = lerp(baseR * 0.86, baseR * 0.12, t);
        const offset = Math.sin(time * 4 + t * 8.5) * (baseR * 0.08);
        ctx.lineTo(cx + funnelWidth + offset + twist * (1 - t), y);
      }
      ctx.closePath();

      const fill = ctx.createLinearGradient(cx, topY, cx, groundY);
      fill.addColorStop(0, 'rgba(248,250,252,0.2)');
      fill.addColorStop(0.45, 'rgba(203,213,225,0.26)');
      fill.addColorStop(1, 'rgba(71,85,105,0.5)');
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,0.42)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      for (let ring = 0; ring < 12; ring += 1) {
        const t = ring / 11;
        const y = topY + (groundY - topY) * t;
        const width = lerp(baseR * 1.2, baseR * 0.18, t);
        const offset = Math.sin(time * 4.2 + t * 9) * (baseR * 0.08);
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.5 + offset, y);
        ctx.lineTo(cx + width * 0.5 + offset, y);
        ctx.strokeStyle = `rgba(248,250,252,${(0.14 - t * 0.05).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Debris field at touchdown
      for (let i = 0; i < 38; i += 1) {
        const angle = time * 5.5 + i * 0.55;
        const radius = baseR * (0.18 + (i % 6) * 0.05);
        const px = cx + Math.cos(angle + i) * radius;
        const py = groundY + (i % 5) * 4 + Math.sin(angle) * 4;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + (i % 3), 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(226,232,240,0.46)' : 'rgba(148,163,184,0.42)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.ellipse(cx, groundY + baseR * 0.1, baseR * 0.9, baseR * 0.22, 0.02, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(125,211,252,0.08)';
      ctx.fill();
    },
    []
  );

  const drawFlood = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      baseR: number,
      time: number
    ) => {
      const width = baseR * 2.6;
      const height = baseR * 1.45;

      const fill = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.9);
      fill.addColorStop(0, 'rgba(59,130,246,0.16)');
      fill.addColorStop(0.52, 'rgba(14,165,233,0.12)');
      fill.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(cx, cy + baseR * 0.12, width, height, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main surge field
      ctx.beginPath();
      ctx.ellipse(cx, cy + baseR * 0.16, width * 0.9, height * 0.66, 0.04, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(96,165,250,0.12)';
      ctx.fill();

      for (let ripple = 0; ripple < 6; ripple += 1) {
        const pulse = ((time * 0.55 + ripple * 0.22) % 1);
        const rx = baseR * (0.5 + pulse * 1.7);
        const ry = baseR * (0.2 + pulse * 0.78);
        ctx.beginPath();
        ctx.ellipse(cx, cy + baseR * 0.12, rx, ry, 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(125,211,252,${((1 - pulse) * 0.24).toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      for (let band = 0; band < 5; band += 1) {
        const y = cy - baseR * 0.18 + band * 13;
        ctx.beginPath();
        for (let step = 0; step <= 72; step += 1) {
          const t = step / 72;
          const x = cx - width * 0.8 + t * width * 1.6;
          const wave = Math.sin(t * 14 + time * 3.4 + band) * (5 + band * 1.2);
          if (step === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.strokeStyle = band % 2 === 0 ? 'rgba(147,197,253,0.3)' : 'rgba(56,189,248,0.2)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      for (let crest = 0; crest < 18; crest += 1) {
        const x = cx - width * 0.62 + crest * (width * 0.075);
        const y = cy + baseR * 0.06 + Math.sin(time * 3 + crest) * 7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 9, y - 5);
        ctx.lineTo(x + 15, y + 1);
        ctx.strokeStyle = 'rgba(224,242,254,0.26)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    },
    []
  );

  const drawWinterStorm = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      baseR: number,
      time: number
    ) => {
      const sweep = Math.sin(time * 0.9) * baseR * 0.12;
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.95);
      halo.addColorStop(0, 'rgba(191,219,254,0.12)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 2, 0, Math.PI * 2);
      ctx.fill();

      for (let band = 0; band < 5; band += 1) {
        ctx.beginPath();
        const y = cy - baseR * 0.9 + band * (baseR * 0.42);
        for (let step = 0; step <= 84; step += 1) {
          const t = step / 84;
          const x = cx - baseR * 1.5 + t * baseR * 3 + sweep;
          const curve = Math.sin(t * 8 + time * 1.8 + band) * (baseR * 0.1);
          if (step === 0) ctx.moveTo(x, y + curve);
          else ctx.lineTo(x, y + curve);
        }
        ctx.strokeStyle = band % 2 === 0 ? 'rgba(191,219,254,0.3)' : 'rgba(125,211,252,0.22)';
        ctx.lineWidth = 2.8;
        ctx.stroke();
      }

      for (let i = 0; i < 72; i += 1) {
        const px = cx - baseR * 1.2 + (i % 14) * (baseR * 0.18) + Math.sin(time + i) * 6;
        const py = cy - baseR * 0.9 + Math.floor(i / 14) * (baseR * 0.45) + ((time * 28 + i * 19) % 24);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 4, py + 12);
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.48)' : 'rgba(224,242,254,0.32)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      for (let crystal = 0; crystal < 16; crystal += 1) {
        const angle = (crystal / 16) * Math.PI * 2 + time * 0.35;
        const px = cx + Math.cos(angle) * baseR * 0.95;
        const py = cy + Math.sin(angle) * baseR * 0.42;
        ctx.beginPath();
        ctx.moveTo(px, py - 5);
        ctx.lineTo(px, py + 5);
        ctx.moveTo(px - 5, py);
        ctx.lineTo(px + 5, py);
        ctx.strokeStyle = 'rgba(219,234,254,0.24)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    []
  );

  const drawTrackGhost = useCallback(
    (ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, visual: DisasterVisual) => {
      if (points.length < 2) return;
      ctx.beginPath();
      points.forEach((pt, index) => {
        if (index === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle =
        visual === 'tornado'
          ? 'rgba(226,232,240,0.22)'
          : visual === 'flood'
            ? 'rgba(96,165,250,0.18)'
            : 'rgba(56,189,248,0.18)';
      ctx.lineWidth = visual === 'tornado' ? 1.5 : 2;
      ctx.setLineDash(visual === 'winter' ? [8, 6] : [10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    []
  );

  useEffect(() => {
    if (!isActive || !map) return;

    const animate = (ts: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min((ts - (lastTsRef.current || ts)) / 1000, 0.05);
      lastTsRef.current = ts;
      timeRef.current += dt;
      if (!isPaused && track.length > 1) {
        const segmentFactor = Math.max(1, track.length - 1);
        progressRef.current = Math.min(
          1,
          progressRef.current + (dt * 0.18 * movementSpeed) / segmentFactor
        );
      }

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (track.length < 1) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const visual = getDisasterVisual(stormType);
      const trackSamples = buildTrackSamples(track, stormType, category, windSpeedKph);
      const sample =
        track.length > 1
          ? getSampleOnTrack(trackSamples, progressRef.current)
          : trackSamples[0];
      const anchor = sample.point;
      const anchorPixel = project(anchor, w, h);
      if (!anchorPixel) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const ghostPoints = track
        .map(point => project(point, w, h))
        .filter((pt): pt is { x: number; y: number } => Boolean(pt));
      drawTrackGhost(ctx, ghostPoints, visual);

      const effectiveIntensity =
        visual === 'hurricane'
          ? clamp(Math.round(sample.categoryValue || category || 1), 1, 5)
          : visual === 'tropical'
            ? clamp(Math.round((windSpeedKph * sample.windScale - 60) / 45), 1, 2)
            : 0;

      const radiusMultiplier =
        visual === 'tornado'
          ? 0.32
          : visual === 'flood'
            ? 0.75
            : visual === 'winter'
              ? 1.2
              : visual === 'tropical'
                ? 0.72
                : CAT[effectiveIntensity]?.scale ?? 0.55;

      const baseR =
        kmToPixels(radiusKm * sample.radiusScale, anchor.lat, w) * radiusMultiplier;

      if (visual === 'hurricane') {
        drawHurricane(ctx, anchorPixel.x, anchorPixel.y, baseR, timeRef.current, effectiveIntensity);
      } else if (visual === 'tropical') {
        drawTropicalStorm(ctx, anchorPixel.x, anchorPixel.y, baseR * sample.visualEnergy, timeRef.current);
      } else if (visual === 'tornado') {
        drawTornado(ctx, anchorPixel.x, anchorPixel.y, Math.max(34, baseR * sample.visualEnergy), timeRef.current);
      } else if (visual === 'flood') {
        drawFlood(ctx, anchorPixel.x, anchorPixel.y, Math.max(50, baseR * sample.visualEnergy), timeRef.current);
      } else {
        drawWinterStorm(ctx, anchorPixel.x, anchorPixel.y, Math.max(52, baseR * sample.visualEnergy), timeRef.current);
      }

      const label =
        visual === 'hurricane'
          ? `CAT ${effectiveIntensity} • ${Math.round(windSpeedKph * sample.windScale)} KM/H`
          : visual === 'tropical'
            ? `TROPICAL RAIN BANDS • ${Math.round(windSpeedKph * sample.windScale)} KM/H`
            : visual === 'tornado'
              ? `TORNADO CORE • ${Math.round(sample.visualEnergy * 100)}%`
              : visual === 'flood'
                ? `FLOOD SURGE FIELD • ${Math.round(sample.visualEnergy * 100)}%`
                : `WINTER COASTAL BAND • ${Math.round(sample.visualEnergy * 100)}%`;
      const progressLabel =
        track.length > 1
          ? `${Math.round(progressRef.current * 100)}% ${isPaused ? '• PAUSED' : `• ${movementSpeed.toFixed(1)}X`}`
          : isPaused
            ? 'PAUSED'
            : `${movementSpeed.toFixed(1)}X`;

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle =
        visual === 'tornado'
          ? '#e2e8f0'
          : visual === 'flood'
            ? '#7dd3fc'
            : visual === 'winter'
              ? '#dbeafe'
              : (CAT[effectiveIntensity]?.core ?? '#93c5fd');
      ctx.fillText(label, anchorPixel.x, anchorPixel.y + Math.max(46, baseR) + 18);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(226,232,240,0.78)';
      ctx.fillText(progressLabel, anchorPixel.x, anchorPixel.y + Math.max(46, baseR) + 34);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    isActive,
    map,
    track,
    category,
    stormType,
    windSpeedKph,
    radiusKm,
    isPaused,
    movementSpeed,
    project,
    kmToPixels,
    drawHurricane,
    drawTropicalStorm,
    drawTornado,
    drawFlood,
    drawWinterStorm,
    drawTrackGhost,
  ]);

  useEffect(() => {
    timeRef.current = 0;
    lastTsRef.current = 0;
    progressRef.current = track.length > 1 ? 0 : 1;
  }, [track, stormType, category, radiusKm, windSpeedKph, resetKey]);

  return null;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
