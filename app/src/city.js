// Vice Panels — an original sample photo drawn in code: a Vice City-style sunset skyline
// (synthwave sun, building silhouettes, palm trees, water reflection). No photograph, no
// Rockstar art — every pixel comes from these drawing calls, so the app always has a third
// sample even before the user loads a photo of their own.

/** A seeded pseudo-random number from an index, so the skyline is the same every run. */
function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Draws one palm silhouette at (x, y) with trunk height `h`, leaning `lean`. */
function drawPalm(ctx, x, y, h, lean) {
  ctx.save();
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = Math.max(3, h * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.6, x + lean * h * 0.45, y - h);
  ctx.stroke();
  const topX = x + lean * h * 0.45;
  const topY = y - h;
  ctx.lineWidth = Math.max(2, h * 0.03);
  for (let f = 0; f < 7; f++) {
    const a = (-0.15 - f * 0.28) * Math.PI + (lean > 0 ? 0.35 : -0.35);
    const len = h * (0.42 - Math.abs(f - 3) * 0.045);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + len * 0.22;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + (ex - topX) * 0.5, topY + (ey - topY) * 0.3 - len * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draws a row of building silhouettes along the horizon, with lit windows. */
function drawSkyline(ctx, w, horizon, base, seed, colour) {
  ctx.fillStyle = colour;
  let x = -10;
  let i = seed;
  while (x < w + 10) {
    const bw = w * (0.05 + rnd(i) * 0.09);
    const bh = base * (0.35 + rnd(i + 50) * 0.65);
    ctx.fillRect(x, horizon - bh, bw, bh);
    // A rooftop antenna on some towers.
    if (rnd(i + 90) > 0.6) {
      ctx.fillRect(x + bw / 2 - 1, horizon - bh - base * 0.12, 2, base * 0.12);
    }
    // Lit windows: a sparse grid of warm dots.
    const cols = Math.max(2, Math.floor(bw / (w * 0.018)));
    const rows = Math.max(2, Math.floor(bh / (base * 0.09)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd(i * 7 + c * 13 + r * 29) > 0.72) {
          ctx.fillStyle = 'rgba(255, 214, 130, 0.9)';
          ctx.fillRect(x + (c + 0.5) * (bw / cols) - 1.5, horizon - bh + (r + 0.5) * (bh / rows) - 1.5, 3, 3);
          ctx.fillStyle = colour;
        }
      }
    }
    x += bw + w * 0.004;
    i++;
  }
}

/**
 * Draws the sunset city onto a fresh canvas of w×h and returns it, so it can be used
 * wherever an image is expected (a panel photo, a sample). Deterministic: same pixels
 * every time it is called.
 */
export function drawSunsetCity(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const horizon = h * 0.68;

  // Sky: deep purple down to a burning orange horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#160b2e');
  sky.addColorStop(0.45, '#5b2a86');
  sky.addColorStop(0.75, '#e83e6b');
  sky.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon + 1);

  // Stars fading out toward the horizon.
  for (let i = 0; i < 70; i++) {
    const sx = rnd(i) * w;
    const sy = rnd(i + 200) * horizon * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + rnd(i + 400) * 0.55})`;
    ctx.fillRect(sx, sy, 1.6, 1.6);
  }

  // The retro sun, low over the horizon, with slits cut through it.
  const sunX = w * 0.5;
  const sunY = horizon - h * 0.1;
  const sunR = h * 0.24;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#fff6b0');
  sun.addColorStop(0.6, '#ffb347');
  sun.addColorStop(1, '#ff5e62');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Slits: sky-coloured bars across the sun's lower half.
  ctx.fillStyle = '#e83e6b';
  let slitY = sunY + sunR * 0.08;
  let slitH = 3;
  while (slitY < sunY + sunR) {
    ctx.fillRect(sunX - sunR - 2, slitY, sunR * 2 + 4, slitH);
    slitY += slitH + sunR * 0.13;
    slitH += 2.5;
  }

  // Two skyline layers, far (lighter) then near (darker).
  drawSkyline(ctx, w, horizon, h * 0.22, 3, '#3a1c56');
  drawSkyline(ctx, w, horizon, h * 0.3, 40, '#1c0b2e');

  // Water: dark strip with the sun's reflection streaked down it.
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, '#2a1145');
  water.addColorStop(1, '#0a0614');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 26; i++) {
    const ry = horizon + (h - horizon) * rnd(i + 700) * 0.95;
    const rw = w * (0.02 + rnd(i + 800) * 0.16);
    const rx = sunX + (rnd(i + 900) - 0.5) * w * 0.3;
    ctx.fillStyle = `rgba(255, ${140 + Math.floor(rnd(i + 950) * 80)}, 60, ${0.12 + rnd(i + 990) * 0.25})`;
    ctx.fillRect(rx - rw / 2, ry, rw, 2.5);
  }

  // Palm silhouettes framing the foreground.
  drawPalm(ctx, w * 0.06, h * 0.98, h * 0.42, 0.5);
  drawPalm(ctx, w * 0.14, h * 1.0, h * 0.3, -0.4);
  drawPalm(ctx, w * 0.94, h * 0.98, h * 0.4, -0.5);
  drawPalm(ctx, w * 0.87, h * 1.0, h * 0.26, 0.35);

  return canvas;
}
