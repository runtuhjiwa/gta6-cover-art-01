// Neon Sunset Cover Lab — photos.
// Loads the built-in sample photos and the user's own files, and hands back a
// canvas-drawn procedural sunset whenever a photo cannot be loaded, so the
// cover never shows an empty hole. Photos are read on the user's own machine
// and never uploaded anywhere.
import { drawProceduralSunset } from './cover.js';

/** Load an image from a URL (a local samples/ path or an object URL). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/**
 * Build a procedural sunset photo as a canvas of the given size. Used as a
 * stand-in photo when a sample file is missing or a panel has no photo yet.
 */
export function proceduralPhoto(w, h, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawProceduralSunset(canvas.getContext('2d'), 0, 0, w, h, seed);
  return canvas;
}

/** The two sample photos the app ships with, free to use. */
export const SAMPLES = [
  { id: 'boulevard', name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', url: 'samples/pier.jpg' },
];

/**
 * Load the sample photos. A sample that fails to load is replaced by a
 * procedural sunset canvas, so the app works even if a sample file is gone.
 * Returns [{ id, name, img, procedural }] in SAMPLES order.
 */
export async function loadSamples() {
  const out = [];
  for (const [i, s] of SAMPLES.entries()) {
    try {
      const img = await loadImage(s.url);
      out.push({ id: s.id, name: s.name, img, procedural: false });
    } catch {
      out.push({ id: s.id, name: s.name, img: proceduralPhoto(1080, 1080, i + 1), procedural: true });
    }
  }
  return out;
}

/** Load the user's own image files into photo entries ({ id, name, img }). */
export async function loadUserFiles(files) {
  const out = [];
  for (const file of files) {
    if (!file.type || !file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      out.push({ id: `user-${Date.now()}-${out.length}`, name: file.name.replace(/\.[^.]+$/, ''), img, procedural: false });
    } catch {
      // Skip a file that does not decode; the cover keeps its current photo.
    }
  }
  return out;
}
