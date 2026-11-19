// Neon Sunset Cover Lab — the editor wiring.
// Loads the sample photos, wires every control to the cover renderer, lets
// the user pan each panel by dragging it on the preview, and exports the
// cover as a PNG in the common post sizes. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { LAYOUTS, GRADES, CAPTION_COLORS, EXPORT_SIZES, clampPan, drawCover } from './cover.js';
import { loadSamples, loadUserFiles } from './photos.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const panelInfo = document.getElementById('panel-info');
const zoomInput = document.getElementById('zoom');

const state = {
  layout: 'hero',
  grade: 'sunset',
  caption: 'Neon Coast',
  subtitle: 'Golden Hour',
  captionColor: '#ffffff',
  captionSize: 1,
  captionPos: 'bottom',
  size: EXPORT_SIZES[2],
  selected: 0,
  panels: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
};

let photos = [];
let drag = null;

function panelCount() {
  return (LAYOUTS[state.layout] || LAYOUTS.hero).panels;
}

function selectedPanel() {
  return state.panels[state.selected];
}

/**
 * Favour the top of a portrait photo (where faces are) when it lands in a
 * wide panel, so the first crop shows a face instead of a chin. Called when
 * a photo is assigned to a panel, never on layout change (a user's own pan
 * is theirs to keep).
 */
function autoPan(panel) {
  const img = panel.img;
  if (!img) return;
  const i = state.panels.indexOf(panel);
  const rects = (LAYOUTS[state.layout] || LAYOUTS.hero).rects(canvas.width, canvas.height);
  const rect = rects[i] || rects[0];
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  panel.ox = 0;
  panel.oy = 0;
  if (imgH > imgW * 1.15 && rect.w > rect.h * 1.2) panel.oy = 0.14;
  clampPan(panel, rect, imgW, imgH);
}

function redraw() {
  if (canvas.width !== state.size.w) canvas.width = state.size.w;
  if (canvas.height !== state.size.h) canvas.height = state.size.h;
  drawCover(ctx, state, canvas.width, canvas.height);
  updatePanelInfo();
}

function updatePanelInfo() {
  const n = panelCount();
  const name = selectedPanel().img ? (selectedPanel().img.name || 'photo') : 'sunset';
  panelInfo.textContent = `Panel ${state.selected + 1} of ${n} — ${name}, zoom ${selectedPanel().zoom.toFixed(2)}x. Click the cover to pick a panel, drag it to pan.`;
  zoomInput.value = String(selectedPanel().zoom);
}

function renderTray() {
  trayEl.innerHTML = '';
  for (const photo of photos) {
    const thumb = document.createElement('img');
    thumb.src = photo.img.src || photo.img.toDataURL();
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      selectedPanel().img = photo.img;
      selectedPanel().img.name = photo.name;
      autoPan(selectedPanel());
      redraw();
      markPicked(photo.id);
    });
    thumb.dataset.id = photo.id;
    trayEl.appendChild(thumb);
  }
}

function markPicked(id) {
  for (const img of trayEl.querySelectorAll('img')) {
    img.classList.toggle('picked', img.dataset.id === id);
  }
}

/** Build the layout, grade, size and colour picker buttons from the constants. */
function buildPickers() {
  const layoutPick = document.getElementById('layout-pick');
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.label;
    b.dataset.key = key;
    b.classList.toggle('on', key === state.layout);
    b.addEventListener('click', () => {
      state.layout = key;
      state.selected = 0;
      for (const x of layoutPick.querySelectorAll('button')) x.classList.toggle('on', x.dataset.key === key);
      redraw();
    });
    layoutPick.appendChild(b);
  }
  const gradePick = document.getElementById('grade-pick');
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = grade.label;
    b.dataset.key = key;
    b.classList.toggle('on', key === state.grade);
    b.addEventListener('click', () => {
      state.grade = key;
      for (const x of gradePick.querySelectorAll('button')) x.classList.toggle('on', x.dataset.key === key);
      redraw();
    });
    gradePick.appendChild(b);
  }
  const sizePick = document.getElementById('size-pick');
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = size.label;
    b.dataset.key = `${size.w}x${size.h}`;
    b.classList.toggle('on', size === state.size);
    b.addEventListener('click', () => {
      state.size = size;
      for (const x of sizePick.querySelectorAll('button')) x.classList.toggle('on', x.dataset.key === `${size.w}x${size.h}`);
      redraw();
    });
    sizePick.appendChild(b);
  }
  const colors = document.getElementById('caption-colors');
  for (const c of CAPTION_COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = c.name;
    b.style.background = c.value;
    b.dataset.value = c.value;
    b.classList.toggle('on', c.value === state.captionColor);
    b.addEventListener('click', () => {
      state.captionColor = c.value;
      for (const x of colors.querySelectorAll('button')) x.classList.toggle('on', x.dataset.value === c.value);
      redraw();
    });
    colors.appendChild(b);
  }
}

/** Set every picker's highlighted button from the current state. */
function syncPickers() {
  for (const [id, key] of [['layout-pick', state.layout], ['grade-pick', state.grade]]) {
    for (const b of document.getElementById(id).querySelectorAll('button')) {
      b.classList.toggle('on', b.dataset.key === key);
    }
  }
  for (const b of document.getElementById('size-pick').querySelectorAll('button')) {
    b.classList.toggle('on', b.dataset.key === `${state.size.w}x${state.size.h}`);
  }
  for (const b of document.getElementById('caption-colors').querySelectorAll('button')) {
    b.classList.toggle('on', b.dataset.value === state.captionColor);
  }
  posBottom.classList.toggle('on', state.captionPos === 'bottom');
  posTop.classList.toggle('on', state.captionPos === 'top');
}

/** Which panel rect (in canvas pixels) holds point (x, y)? -1 for none. */
function hitPanel(x, y) {
  const rects = (LAYOUTS[state.layout] || LAYOUTS.hero).rects(canvas.width, canvas.height);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * canvas.width,
    y: ((e.clientY - box.top) / box.height) * canvas.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  const rects = (LAYOUTS[state.layout] || LAYOUTS.hero).rects(canvas.width, canvas.height);
  drag = { panel: state.panels[i], rect: rects[i], startX: p.x, startY: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('dragging');
  updatePanelInfo();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const dx = (p.x - drag.startX) / drag.rect.w;
  const dy = (p.y - drag.startY) / drag.rect.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  drag.panel.ox = drag.ox + dx;
  drag.panel.oy = drag.oy + dy;
  redraw();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
  redraw();
});

zoomInput.addEventListener('input', () => {
  selectedPanel().zoom = Number(zoomInput.value);
  redraw();
});

document.getElementById('fill-all').addEventListener('click', () => {
  const img = selectedPanel().img;
  for (const panel of state.panels) {
    panel.img = img;
    panel.zoom = selectedPanel().zoom;
    autoPan(panel);
  }
  redraw();
  statusEl.textContent = 'Every panel now uses the selected photo.';
});

document.getElementById('reset-panel').addEventListener('click', () => {
  selectedPanel().zoom = 1;
  selectedPanel().ox = 0;
  selectedPanel().oy = 0;
  redraw();
});

const captionInput = document.getElementById('caption');
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
const subtitleInput = document.getElementById('subtitle');
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  redraw();
});

const posBottom = document.getElementById('pos-bottom');
const posTop = document.getElementById('pos-top');
function setCaptionPos(pos) {
  state.captionPos = pos;
  posBottom.classList.toggle('on', pos === 'bottom');
  posTop.classList.toggle('on', pos === 'top');
  redraw();
}
posBottom.addEventListener('click', () => setCaptionPos('bottom'));
posTop.addEventListener('click', () => setCaptionPos('top'));

document.getElementById('photo').addEventListener('change', async (e) => {
  const added = await loadUserFiles([...e.target.files]);
  if (!added.length) {
    statusEl.textContent = 'No image in those files.';
    return;
  }
  photos = photos.concat(added);
  renderTray();
  selectedPanel().img = added[0].img;
  selectedPanel().img.name = added[0].name;
  autoPan(selectedPanel());
  markPicked(added[0].id);
  redraw();
  statusEl.textContent = `Added ${added.length} photo${added.length > 1 ? 's' : ''}.`;
});

const drop = document.getElementById('drop');
['dragover', 'dragenter'].forEach((name) => drop.addEventListener(name, (e) => {
  e.preventDefault();
  drop.classList.add('over');
}));
['dragleave', 'drop'].forEach((name) => drop.addEventListener(name, () => drop.classList.remove('over')));
drop.addEventListener('drop', async (e) => {
  e.preventDefault();
  const added = await loadUserFiles([...(e.dataTransfer?.files ?? [])]);
  if (!added.length) return;
  photos = photos.concat(added);
  renderTray();
  selectedPanel().img = added[0].img;
  selectedPanel().img.name = added[0].name;
  autoPan(selectedPanel());
  markPicked(added[0].id);
  redraw();
  statusEl.textContent = `Added ${added.length} photo${added.length > 1 ? 's' : ''}.`;
});

document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${state.size.w}x${state.size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved neon-coast-cover-${state.size.w}x${state.size.h}.png`;
  }, 'image/png');
});

/** Spread the loaded photos across the panels, alternating them. */
function distributePhotos(list) {
  for (let i = 0; i < state.panels.length; i++) {
    const photo = list[i % list.length];
    state.panels[i].img = photo.img;
    state.panels[i].img.name = photo.name;
    autoPan(state.panels[i]);
  }
}

buildPickers();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (photo, patch) => {
    const samples = await loadSamples();
    photos = samples;
    renderTray();
    state.layout = patch.layout;
    state.grade = patch.grade;
    state.caption = patch.caption;
    state.subtitle = patch.subtitle;
    const [w, h] = patch.size.split('x').map(Number);
    state.size = { w, h, label: `${w} x ${h}` };
    distributePhotos([photo, ...samples.filter((s) => s.id !== photo.id)]);
    captionInput.value = state.caption;
    subtitleInput.value = state.subtitle;
    syncPickers();
    redraw();
  });
} else {
  loadSamples().then((samples) => {
    photos = samples;
    renderTray();
    distributePhotos(samples);
    redraw();
  });
}
redraw();
