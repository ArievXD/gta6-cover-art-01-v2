// Vice Panels — the editor. Wires the controls to the cover renderer: photo per panel with
// drag-to-pan and scroll-to-zoom, layout / grade / caption controls, and PNG export in the
// three post sizes. The preview canvas draws at the selected export size, so what you see is
// exactly what the PNG holds (the selection outline is drawn on top, never exported).
import { drawCover, panelRects, SIZES, LAYOUTS, GRADES, CAPTION_STYLES } from './cover.js';
import { drawSunsetCity } from './city.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

const SAMPLES = {
  boulevard: { label: 'Boulevard', file: 'samples/boulevard.jpg' },
  pier: { label: 'Pier', file: 'samples/pier.jpg' },
  city: { label: 'Sunset City', file: null }, // drawn in code, see loadSample
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const cityCanvas = drawSunsetCity(1200, 900);
const loadedImages = new Map([['city', cityCanvas]]);

/** The sample photo for a key, loaded once and cached. */
async function loadSample(key) {
  if (loadedImages.has(key)) return loadedImages.get(key);
  const img = await loadImage(SAMPLES[key].file);
  loadedImages.set(key, img);
  return img;
}

const state = {
  size: 'wide',
  layout: 'hero',
  grade: 'sunset',
  halftone: true,
  caption: 'VICE NIGHTS',
  tagline: 'LEONIDA • 2026',
  captionStyle: 'solid',
  captionPos: 'bottom',
  captionScale: 1,
  selected: 0,
  panels: [
    { key: 'boulevard', img: null, zoom: 1.05, ox: -0.05, oy: 0.6 },
    { key: 'pier', img: null, zoom: 1.1, ox: 0.08, oy: 0.5 },
    { key: 'city', img: cityCanvas, zoom: 1, ox: 0, oy: 0 },
    { key: 'pier', img: null, zoom: 1.2, ox: -0.1, oy: 0.5 },
  ],
};

/** The preview canvas always draws at the selected export size. */
function applySize() {
  const { w, h } = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
}

/** Renders the cover, then the editor-only selection outline on top. */
function render() {
  drawCover(canvas, state);
  const rects = panelRects(canvas.width, canvas.height, state.layout, state.captionPos);
  const sel = rects[state.selected];
  if (sel) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, canvas.width * 0.003);
    ctx.setLineDash([Math.max(10, canvas.width * 0.012), Math.max(8, canvas.width * 0.008)]);
    ctx.strokeRect(sel.x + 2, sel.y + 2, sel.w - 4, sel.h - 4);
    ctx.setLineDash([]);
    const label = `PANEL ${state.selected + 1}`;
    const fs = Math.max(16, canvas.width * 0.016);
    ctx.font = `700 ${fs}px "Helvetica Neue", Arial, sans-serif`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10, 6, 20, 0.85)';
    ctx.fillRect(sel.x + 6, sel.y + 6, tw + fs * 1.1, fs * 1.9);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, sel.x + 6 + fs * 0.55, sel.y + 6 + fs * 0.95);
    ctx.restore();
  }
  const p = state.panels[state.selected];
  $('panelNumber').textContent = `into panel ${state.selected + 1}`;
  statusEl.textContent = p && p.img
    ? `Panel ${state.selected + 1}: ${SAMPLES[p.key]?.label ?? 'your photo'} — zoom ${Math.round(p.zoom * 100)}% — drag to move, scroll to zoom`
    : `Panel ${state.selected + 1} is empty — drop a photo on it or pick a sample below.`;
}

function setActive(group, value) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach((b) => {
    b.classList.toggle('active', b.dataset.value === value);
  });
}

/** Puts a photo into the selected panel and redraws. */
function setPanelPhoto(img, key) {
  const p = state.panels[state.selected];
  p.img = img;
  p.key = key;
  p.zoom = 1.05;
  p.ox = 0;
  p.oy = 0;
  render();
}

/** Copies the selected panel's photo into every panel, each cropped differently. */
function fillAllPanels() {
  const src = state.panels[state.selected];
  if (!src.img) return;
  const crops = [
    { zoom: 1.15, ox: -0.12, oy: 0.45 },
    { zoom: 1.15, ox: 0.12, oy: 0.4 },
    { zoom: 1.25, ox: 0, oy: 0.5 },
    { zoom: 1.15, ox: 0.08, oy: 0.35 },
  ];
  state.panels.forEach((p, i) => {
    p.img = src.img;
    p.key = src.key;
    p.zoom = crops[i].zoom;
    p.ox = crops[i].ox;
    p.oy = crops[i].oy;
  });
  render();
}

/** Renders the cover at an exact size and downloads it as a PNG. */
function exportPNG(sizeKey) {
  const { w, h } = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-panels-${w}x${h}.png`;
  }, 'image/png');
}

/** The screenshot script's hook: the cover at w×h as a PNG data URL. */
window.__exportPNG = async (w, h) => {
  await document.fonts.ready;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return off.toDataURL('image/png');
};

/** The shot script's hook: apply a state patch, load its photos, redraw. */
window.__applyShot = async (patch) => {
  Object.assign(state, patch);
  for (let i = 0; i < state.panels.length; i++) {
    const p = state.panels[i];
    if (p.key && !p.img) p.img = await loadSample(p.key);
  }
  applySize();
  render();
};

// --- controls ---
document.querySelectorAll('[data-group="layout"]').forEach((b) => {
  b.addEventListener('click', () => { state.layout = b.dataset.value; setActive('layout', state.layout); render(); });
});
document.querySelectorAll('[data-group="grade"]').forEach((b) => {
  b.addEventListener('click', () => { state.grade = b.dataset.value; setActive('grade', state.grade); render(); });
});
document.querySelectorAll('[data-group="size"]').forEach((b) => {
  b.addEventListener('click', () => { state.size = b.dataset.value; setActive('size', state.size); applySize(); render(); });
});
$('caption').addEventListener('input', (e) => { state.caption = e.target.value; render(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
$('captionStyle').addEventListener('change', (e) => { state.captionStyle = e.target.value; render(); });
$('captionPos').addEventListener('change', (e) => { state.captionPos = e.target.value; render(); });
$('captionScale').addEventListener('input', (e) => {
  state.captionScale = Number(e.target.value);
  $('captionScaleValue').textContent = `${Math.round(state.captionScale * 100)}%`;
  render();
});
$('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; render(); });
$('zoom').addEventListener('input', (e) => {
  const p = state.panels[state.selected];
  p.zoom = Number(e.target.value);
  $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
  render();
});
$('fillAll').addEventListener('click', fillAllPanels);
$('resetPanel').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.zoom = 1.05; p.ox = 0; p.oy = 0;
  $('zoom').value = p.zoom;
  $('zoomValue').textContent = '105%';
  render();
});
$('clearPanel').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.img = null; p.key = null;
  render();
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    const img = await loadSample(b.dataset.sample);
    setPanelPhoto(img, b.dataset.sample);
  });
});
$('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  setPanelPhoto(img, null);
  e.target.value = '';
});
document.querySelectorAll('[data-export]').forEach((b) => {
  b.addEventListener('click', () => exportPNG(b.dataset.export));
});

// --- canvas interaction: click to select a panel, drag to pan, wheel to zoom ---
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
function panelAt(x, y) {
  const rects = panelRects(canvas.width, canvas.height, state.layout, state.captionPos);
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selected = i;
  const p = state.panels[i];
  drag = { x, y, ox: p.ox, oy: p.oy, moved: false };
  $('zoom').value = p.zoom;
  $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const rects = panelRects(canvas.width, canvas.height, state.layout, state.captionPos);
  const rect = rects[state.selected];
  const p = state.panels[state.selected];
  if (!p.img || !rect) return;
  if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 3) drag.moved = true;
  p.ox = drag.ox + (x - drag.x) / rect.w;
  p.oy = drag.oy + (y - drag.y) / rect.h;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  if (!p.img) return;
  p.zoom = Math.max(1, Math.min(4, p.zoom * Math.exp(-e.deltaY * 0.0012)));
  $('zoom').value = p.zoom;
  $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
  render();
}, { passive: false });

// --- drag and drop a photo onto the preview ---
const stage = $('stage');
['dragenter', 'dragover'].forEach((ev) => stage.addEventListener(ev, (e) => {
  e.preventDefault();
  stage.classList.add('dropping');
}));
['dragleave', 'drop'].forEach((ev) => stage.addEventListener(ev, (e) => {
  e.preventDefault();
  stage.classList.remove('dropping');
}));
stage.addEventListener('drop', async (e) => {
  const file = [...(e.dataTransfer.files || [])].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  setPanelPhoto(img, null);
});

// --- boot: load the default samples, then draw (and redraw once the font arrives) ---
(async () => {
  for (let i = 0; i < state.panels.length; i++) {
    const p = state.panels[i];
    if (p.key && !p.img) p.img = await loadSample(p.key);
  }
  applySize();
  render();
  try { await document.fonts.load('100px Anton'); } catch { /* fall back to system fonts */ }
  render();
})();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search));
}
