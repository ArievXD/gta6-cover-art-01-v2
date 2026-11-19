// Vice Panels — fixed scenes for screenshots. ?shot=cover renders one cover full-screen
// (controls hidden) from the query's layout, grade, photos and caption; ?shot=editor shows
// the editor with those photos loaded. window.__shotReady is set once the scene is painted,
// so the screenshot script knows when to capture.

/** The photos a shot names, as panel states: "boulevard,pier,city". */
function shotPanels(query) {
  const keys = (query.get('photos') || 'boulevard,pier,city,pier').split(',');
  const crops = [
    { zoom: 1.05, ox: -0.05, oy: 0.6 },
    { zoom: 1.1, ox: 0.08, oy: 0.5 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1.2, ox: -0.1, oy: 0.5 },
  ];
  return keys.slice(0, 4).map((key, i) => ({
    key: key.trim(),
    img: null,
    zoom: crops[i].zoom,
    ox: crops[i].ox,
    oy: crops[i].oy,
  }));
}

export async function runShot(shot, query) {
  const patch = {
    size: query.get('size') || 'wide',
    layout: query.get('layout') || 'hero',
    grade: query.get('grade') || 'sunset',
    halftone: query.get('halftone') !== '0',
    caption: query.get('caption') ?? 'VICE NIGHTS',
    tagline: query.get('tagline') ?? 'LEONIDA • 2026',
    captionStyle: query.get('captionStyle') || 'solid',
    captionPos: query.get('captionPos') || 'bottom',
    captionScale: Number(query.get('captionScale') || 1),
    selected: Number(query.get('selected') || 0),
    panels: shotPanels(query),
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await window.__applyShot(patch);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
