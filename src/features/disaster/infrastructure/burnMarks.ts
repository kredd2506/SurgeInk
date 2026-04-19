/**
 * Generates burn mark textures as HTMLCanvasElement — irregular organic
 * scorch holes in paper. High-resolution canvas with blur-filtered edges
 * and smoothed multi-octave noise for non-geometric, organic shapes.
 */

interface BurnOptions {
  seed: number;
  size?: number;
}

/** Mulberry32 seeded PRNG for deterministic variants. */
function createRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Multi-octave smoothed ring noise — cosine-interpolated values around a circle.
 * Produces natural-looking organic variation (not uniform jitter).
 */
function smoothRingNoise(rng: () => number, points: number, octaves: number): number[] {
  const values = new Array(points).fill(0);
  let amplitude = 1;

  for (let oct = 0; oct < octaves; oct++) {
    const nPoints = Math.max(3, Math.round(points / (2 ** oct)));
    const baseValues: number[] = [];
    for (let i = 0; i < nPoints; i++) baseValues.push(rng() * 2 - 1);

    for (let i = 0; i < points; i++) {
      const t = (i / points) * nPoints;
      const i0 = Math.floor(t) % nPoints;
      const i1 = (i0 + 1) % nPoints;
      const frac = t - Math.floor(t);
      const w = (1 - Math.cos(frac * Math.PI)) / 2;
      values[i] += (baseValues[i0] * (1 - w) + baseValues[i1] * w) * amplitude;
    }

    amplitude *= 0.5;
  }

  return values;
}

/**
 * Draw an organic closed blob with Catmull-Rom → cubic Bezier smoothing.
 */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseR: number,
  variance: number,
  rng: () => number,
): void {
  const points = 96;
  const noise = smoothRingNoise(rng, points, 4);
  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = baseR * (1 + noise[i] * variance);
    coords.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  ctx.beginPath();
  ctx.moveTo(coords[0][0], coords[0][1]);
  for (let i = 0; i < points; i++) {
    const p0 = coords[(i - 1 + points) % points];
    const p1 = coords[i];
    const p2 = coords[(i + 1) % points];
    const p3 = coords[(i + 2) % points];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  ctx.closePath();
}

export function createBurnMarkCanvas({
  seed,
  size = 256,
}: BurnOptions): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rng = createRandom(seed);
  const cx = size / 2;
  const cy = size / 2;

  // Global blur for soft organic edges
  ctx.filter = "blur(2px)";

  // 1. Outer scorched paper tint — very soft, wide halo
  const outerGrad = ctx.createRadialGradient(cx, cy, size * 0.18, cx, cy, size * 0.5);
  outerGrad.addColorStop(0, "rgba(56, 34, 18, 0.28)");
  outerGrad.addColorStop(0.45, "rgba(90, 55, 28, 0.2)");
  outerGrad.addColorStop(0.78, "rgba(140, 95, 60, 0.08)");
  outerGrad.addColorStop(1, "rgba(160, 120, 90, 0)");
  ctx.fillStyle = outerGrad;
  drawBlob(ctx, cx, cy, size * 0.46, 0.13, rng);
  ctx.fill();

  // 2. Mid charred/ember zone — warm brown → dark
  const midGrad = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.38);
  midGrad.addColorStop(0, "rgba(8, 4, 2, 0.95)");
  midGrad.addColorStop(0.4, "rgba(40, 22, 10, 0.85)");
  midGrad.addColorStop(0.72, "rgba(100, 60, 30, 0.4)");
  midGrad.addColorStop(1, "rgba(140, 95, 60, 0)");
  ctx.fillStyle = midGrad;
  drawBlob(ctx, cx, cy, size * 0.36, 0.19, rng);
  ctx.fill();

  // 3. Inner black char — hot core
  ctx.filter = "blur(1.2px)";
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.28);
  innerGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
  innerGrad.addColorStop(0.55, "rgba(5, 3, 2, 0.92)");
  innerGrad.addColorStop(1, "rgba(30, 18, 10, 0)");
  ctx.fillStyle = innerGrad;
  drawBlob(ctx, cx, cy, size * 0.22, 0.26, rng);
  ctx.fill();

  // 4. Soft ash flecks
  ctx.filter = "blur(0.8px)";
  ctx.globalCompositeOperation = "multiply";
  const fleckCount = 80;
  for (let i = 0; i < fleckCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = size * (0.22 + rng() * 0.3);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = rng() * 2.6 + 0.4;
    const alpha = rng() * 0.3 + 0.12;
    ctx.fillStyle = `rgba(18, 10, 5, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export const BURN_IMAGE_IDS = ["burn-0", "burn-1", "burn-2", "burn-3"] as const;
export type BurnImageId = typeof BURN_IMAGE_IDS[number];

export function getBurnMarkCanvases(size = 256): HTMLCanvasElement[] {
  const seeds = [13, 42, 77, 101];
  return seeds.map((seed) => createBurnMarkCanvas({ seed, size }));
}
