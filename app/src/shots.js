// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the cover alone, full frame, at the size
// the browser window is set to. Query params: photo (sample id), caption,
// subtitle, layout, grade, size (1080x1080, 1080x1350 or 1920x1080).
// window.__shotReady is set once the scene is painted.
import { loadSamples } from './photos.js';

export async function runShot(shot, query, apply) {
  const samples = await loadSamples();
  const byId = new Map(samples.map((s) => [s.id, s]));
  const photo = byId.get(query.get('photo') ?? 'boulevard') ?? samples[0];
  const patch = {
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    caption: query.get('caption') ?? 'Neon Coast',
    subtitle: query.get('subtitle') ?? 'Golden Hour',
    size: query.get('size') ?? '1920x1080',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply(photo, patch);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
