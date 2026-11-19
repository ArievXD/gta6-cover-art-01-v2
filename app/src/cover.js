// Vice Panels — the cover renderer. Draws a multi-panel GTA-poster-style cover onto any canvas:
// panels with white gutters on a black field, a sunset caption band, a colour grade and an optional
// halftone dot treatment. Everything is drawn from the state object, so the editor preview and the
// exported PNGs are the same drawing at different sizes.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = {
  hero: 'Hero + two',
  quad: 'Four up',
  strip: 'Wide strip',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon',
  noir: 'Noir',
  original: 'Original',
};

export const CAPTION_STYLES = {
  solid: 'Solid white',
  outline: 'Outline',
  sunset: 'Sunset fill',
};

const CAPTION_FONT = 'Anton, "Arial Black", "Helvetica Neue", sans-serif';
const TAGLINE_FONT = '"Helvetica Neue", Arial, sans-serif';

/** Panel rectangles and the caption band for a cover of w×h in the given layout. */
export function layoutPanels(w, h, layout, captionPos) {
  const bandH = Math.round(h * 0.15);
  const m = Math.max(4, Math.round(Math.min(w, h) * 0.012)); // black outer frame
  const g = Math.max(6, Math.round(Math.min(w, h) * 0.01)); // white gutter
  const bandY = captionPos === 'top' ? m : h - m - bandH;
  const band = { x: m, y: bandY, w: w - 2 * m, h: bandH };
  const ax = m;
  const ay = captionPos === 'top' ? bandY + bandH + g : m;
  const aw = w - 2 * m;
  const ah = h - bandH - g - 2 * m;
  const half = (v) => v / 2 - g / 2;
  let panels;
  if (layout === 'quad') {
    panels = [
      { x: ax, y: ay, w: half(aw), h: half(ah) },
      { x: ax + half(aw) + g, y: ay, w: half(aw), h: half(ah) },
      { x: ax, y: ay + half(ah) + g, w: half(aw), h: half(ah) },
      { x: ax + half(aw) + g, y: ay + half(ah) + g, w: half(aw), h: half(ah) },
    ];
  } else if (layout === 'strip') {
    panels = [
      { x: ax, y: ay, w: aw, h: ah * 0.58 - g / 2 },
      { x: ax, y: ay + ah * 0.58 + g / 2, w: half(aw), h: ah * 0.42 - g / 2 },
      { x: ax + half(aw) + g, y: ay + ah * 0.58 + g / 2, w: half(aw), h: ah * 0.42 - g / 2 },
    ];
  } else {
    // hero: a big panel with two stacked beside it (landscape/square) or above a pair (portrait)
    if (w >= h) {
      panels = [
        { x: ax, y: ay, w: aw * 0.58 - g / 2, h: ah },
        { x: ax + aw * 0.58 + g / 2, y: ay, w: aw * 0.42 - g / 2, h: half(ah) },
        { x: ax + aw * 0.58 + g / 2, y: ay + half(ah) + g, w: aw * 0.42 - g / 2, h: half(ah) },
      ];
    } else {
      panels = [
        { x: ax, y: ay, w: aw, h: ah * 0.55 - g / 2 },
        { x: ax, y: ay + ah * 0.55 + g / 2, w: half(aw), h: ah * 0.45 - g / 2 },
        { x: ax + half(aw) + g, y: ay + ah * 0.55 + g / 2, w: half(aw), h: ah * 0.45 - g / 2 },
      ];
    }
  }
  return { band, panels, gutter: g, frame: m };
}

/** The panel rectangles the editor hit-tests against (same geometry as the drawing). */
export function panelRects(w, h, layout, captionPos) {
  return layoutPanels(w, h, layout, captionPos).panels;
}

function imageSize(img) {
  return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}

/** Draws one photo into a panel rect, cover-fit, at the panel's zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const { w: iw, h: ih } = imageSize(img);
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  // Clamp the pan so the photo always covers the panel.
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const cx = Math.max(-maxOx, Math.min(maxOx, ox));
  const cy = Math.max(-maxOy, Math.min(maxOy, oy));
  ctx.drawImage(img, rect.x + (rect.w - dw) / 2 + cx * rect.w, rect.y + (rect.h - dh) / 2 + cy * rect.h, dw, dh);
}

/** The colour filter a grade puts on the photos (applied while drawing them). */
function gradeFilter(grade) {
  if (grade === 'sunset') return 'saturate(1.28) contrast(1.06)';
  if (grade === 'neon') return 'saturate(1.4) contrast(1.1)';
  if (grade === 'noir') return 'grayscale(1) contrast(1.32) brightness(1.03)';
  return 'none';
}

/** A warm / neon wash laid over a panel after its photo, in the grade's colours. */
function gradeWash(ctx, rect, grade) {
  if (grade === 'original') return;
  let wash;
  if (grade === 'sunset') {
    wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 150, 60, 0.10)');
    wash.addColorStop(0.55, 'rgba(255, 90, 60, 0.08)');
    wash.addColorStop(1, 'rgba(255, 40, 120, 0.30)');
  } else if (grade === 'neon') {
    wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(120, 60, 255, 0.20)');
    wash.addColorStop(0.5, 'rgba(0, 190, 255, 0.10)');
    wash.addColorStop(1, 'rgba(255, 0, 180, 0.22)');
  } else {
    wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    wash.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

let halftoneTile = null;
/** A small dot tile for the comic halftone treatment, built once and reused. */
function halftonePattern(ctx) {
  if (halftoneTile) return halftoneTile;
  const t = document.createElement('canvas');
  t.width = 9;
  t.height = 9;
  const c = t.getContext('2d');
  c.fillStyle = '#000000';
  c.beginPath();
  c.arc(4.5, 4.5, 1.7, 0, Math.PI * 2);
  c.fill();
  halftoneTile = ctx.createPattern(t, 'repeat');
  return halftoneTile;
}

/** A soft sun disc glowing behind the caption, drawn inside the band. */
function drawSun(ctx, band) {
  const cx = band.x + band.w / 2;
  const cy = band.y + band.h * 0.55;
  const r = band.h * 1.05;
  const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  sun.addColorStop(0, 'rgba(255, 238, 170, 0.85)');
  sun.addColorStop(0.45, 'rgba(255, 170, 70, 0.45)');
  sun.addColorStop(1, 'rgba(255, 90, 60, 0)');
  ctx.save();
  ctx.fillStyle = sun;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.restore();
}

/** The caption band: sunset gradient, sun glow, tagline and the big caption. */
function drawCaptionBand(ctx, band, state) {
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, '#1c0b33');
  grad.addColorStop(0.38, '#7b2d8b');
  grad.addColorStop(0.72, '#e83e6b');
  grad.addColorStop(1, '#ff7a2f');
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  drawSun(ctx, band);

  const tagline = (state.tagline || '').trim().toUpperCase();
  const caption = (state.caption || '').trim().toUpperCase();
  const scale = state.captionScale || 1;

  if (tagline) {
    const tSize = Math.max(10, band.h * 0.13);
    ctx.font = `700 ${tSize}px ${TAGLINE_FONT}`;
    try { ctx.letterSpacing = `${Math.round(tSize * 0.35)}px`; } catch { /* older canvas: no tracking */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = tSize * 0.3;
    ctx.fillText(tagline, band.x + band.w / 2, band.y + band.h * 0.24);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  if (!caption) return;
  const maxW = band.w * 0.94;
  const capH = tagline ? band.h * 0.56 : band.h * 0.74;
  let size = capH * scale;
  ctx.font = `${size}px ${CAPTION_FONT}`;
  while (size > 12 && ctx.measureText(caption).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${CAPTION_FONT}`;
  }
  const baseline = tagline ? band.y + band.h * 0.86 : band.y + band.h * 0.74;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  if (state.captionStyle === 'outline') {
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(caption, band.x + band.w / 2, baseline);
  } else {
    if (state.captionStyle === 'sunset') {
      const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
      fill.addColorStop(0, '#ffffff');
      fill.addColorStop(0.55, '#ffe08a');
      fill.addColorStop(1, '#ff7a2f');
      ctx.fillStyle = fill;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
    ctx.strokeText(caption, band.x + band.w / 2, baseline);
    ctx.fillText(caption, band.x + band.w / 2, baseline);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole cover for `state` onto the canvas's 2D context at the canvas's own size.
 * state: { layout, grade, halftone, caption, tagline, captionStyle, captionPos, captionScale,
 *           panels: [{ img, zoom, ox, oy }] } — panels beyond the layout's count are ignored.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const { band, panels } = layoutPanels(w, h, state.layout, state.captionPos);
  const area = { x: panels[0].x, y: panels[0].y, w, h };

  ctx.fillStyle = '#0a0614';
  ctx.fillRect(0, 0, w, h);

  const filter = gradeFilter(state.grade);
  panels.forEach((rect, i) => {
    const p = state.panels[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (p && p.img) {
      ctx.filter = filter;
      drawPhotoInto(ctx, p.img, rect, p.zoom || 1, p.ox || 0, p.oy || 0);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradeWash(ctx, rect, state.grade);
    ctx.restore();
  });

  if (state.halftone) {
    const pattern = halftonePattern(ctx);
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = pattern;
      const minX = Math.min(...panels.map((p) => p.x));
      const minY = Math.min(...panels.map((p) => p.y));
      const maxX = Math.max(...panels.map((p) => p.x + p.w));
      const maxY = Math.max(...panels.map((p) => p.y + p.h));
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }
  }

  drawCaptionBand(ctx, band, state);
  return { band, panels, area };
}
