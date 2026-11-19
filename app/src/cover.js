// Neon Sunset Cover Lab — the cover renderer.
// Draws a multi-panel poster-style cover onto a 2D canvas: white-guttered
// panels filled with the user's photos, a sunset or neon colour grade, grain
// and a vignette, and bold poster lettering for the caption. Everything is
// drawn with the canvas API; no image, font or asset is fetched.

export const LAYOUTS = {
  hero: {
    label: 'Hero + two',
    panels: 3,
    rects(w, h) {
      const g = w * 0.012;
      const big = w * 0.62;
      return [
        { x: g, y: g, w: big - g * 1.5, h: h - g * 2 },
        { x: big + g * 0.5, y: g, w: w - big - g * 1.5, h: (h - g * 3) / 2 },
        { x: big + g * 0.5, y: (h + g) / 2, w: w - big - g * 1.5, h: (h - g * 3) / 2 },
      ];
    },
  },
  strips: {
    label: 'Three strips',
    panels: 3,
    rects(w, h) {
      const g = w * 0.012;
      const pw = (w - g * 4) / 3;
      return [0, 1, 2].map((i) => ({ x: g + i * (pw + g), y: g, w: pw, h: h - g * 2 }));
    },
  },
  grid: {
    label: 'Four squares',
    panels: 4,
    rects(w, h) {
      const g = w * 0.012;
      const pw = (w - g * 3) / 2;
      const ph = (h - g * 3) / 2;
      return [
        { x: g, y: g, w: pw, h: ph },
        { x: g * 2 + pw, y: g, w: pw, h: ph },
        { x: g, y: g * 2 + ph, w: pw, h: ph },
        { x: g * 2 + pw, y: g * 2 + ph, w: pw, h: ph },
      ];
    },
  },
  bleed: {
    label: 'Full bleed',
    panels: 1,
    rects(w, h) {
      const g = w * 0.012;
      return [{ x: g, y: g, w: w - g * 2, h: h - g * 2 }];
    },
  },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    top: 'rgba(255, 176, 66, 0.28)',
    mid: 'rgba(255, 94, 98, 0.22)',
    bottom: 'rgba(140, 40, 140, 0.42)',
    glow: 'rgba(255, 150, 60, 0.55)',
    blend: 'overlay',
  },
  neon: {
    label: 'Neon Night',
    top: 'rgba(0, 229, 255, 0.20)',
    mid: 'rgba(255, 0, 160, 0.18)',
    bottom: 'rgba(60, 0, 120, 0.50)',
    glow: 'rgba(255, 0, 180, 0.45)',
    blend: 'overlay',
  },
  golden: {
    label: 'Golden Hour',
    top: 'rgba(255, 214, 120, 0.30)',
    mid: 'rgba(255, 150, 50, 0.20)',
    bottom: 'rgba(120, 60, 10, 0.38)',
    glow: 'rgba(255, 200, 90, 0.55)',
    blend: 'soft-light',
  },
  noir: {
    label: 'Noir',
    top: 'rgba(120, 160, 200, 0.14)',
    mid: 'rgba(40, 60, 90, 0.22)',
    bottom: 'rgba(5, 8, 20, 0.55)',
    glow: 'rgba(150, 190, 255, 0.30)',
    blend: 'overlay',
  },
};

export const CAPTION_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Hot pink', value: '#ff2e88' },
  { name: 'Neon yellow', value: '#ffe14d' },
  { name: 'Cyan', value: '#37e6ff' },
];

export const EXPORT_SIZES = [
  { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { label: 'Landscape 1920 x 1080', w: 1920, h: 1080 },
];

/** The poster's lettering stack: heavy system sans only, no font file. */
export const LETTER_FONT = '"Arial Black", "Archivo Black", Impact, "Franklin Gothic Heavy", "Haettenschweiler", sans-serif';

/** Clamp a panel's pan offset so its photo always covers the panel. */
export function clampPan(panel, rect, imgW, imgH) {
  const base = Math.max(rect.w / imgW, rect.h / imgH);
  const dw = imgW * base * panel.zoom;
  const dh = imgH * base * panel.zoom;
  const maxX = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxY = Math.max(0, (dh - rect.h) / 2 / rect.h);
  panel.ox = Math.max(-maxX, Math.min(maxX, panel.ox || 0));
  panel.oy = Math.max(-maxY, Math.min(maxY, panel.oy || 0));
}

/** Draw one photo into a panel rect, cover-fit, with the panel's pan/zoom. */
export function drawPanelPhoto(ctx, img, panel, rect) {
  // A canvas photo (the procedural fallback) has no naturalWidth; use width.
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const base = Math.max(rect.w / imgW, rect.h / imgH);
  const dw = imgW * base * panel.zoom;
  const dh = imgH * base * panel.zoom;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  // A faint inner edge so panels read as separate frames.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = Math.max(1, rect.w * 0.003);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** A seeded pseudo-random number, so grain is stable between renders. */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Paint film grain and a dark vignette over the whole cover. */
export function drawGrainAndVignette(ctx, w, h, seed = 7) {
  const rand = seededRandom(seed);
  const dots = Math.floor((w * h) / 9000);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < dots; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.6 + 0.4;
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Paint the caption in bold poster lettering with a gradient fill and outline. */
export function drawCaption(ctx, state, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();
  if (!text && !sub) return;
  const atTop = state.captionPos === 'top';
  const bandH = h * 0.30;
  const bandY = atTop ? 0 : h - bandH;
  // A soft dark band behind the lettering so it reads on any photo.
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (atTop) {
    band.addColorStop(0, 'rgba(8,0,18,0.72)');
    band.addColorStop(1, 'rgba(8,0,18,0)');
  } else {
    band.addColorStop(0, 'rgba(8,0,18,0)');
    band.addColorStop(1, 'rgba(8,0,18,0.78)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  const margin = w * 0.05;
  const maxW = w - margin * 2;
  if (sub) {
    let subSize = h * 0.032 * (state.captionSize || 1);
    ctx.font = `900 ${subSize}px ${LETTER_FONT}`;
    while (ctx.measureText(sub).width > maxW * 0.8 && subSize > 10) {
      subSize -= 1;
      ctx.font = `900 ${subSize}px ${LETTER_FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = state.grade === 'neon' ? '#37e6ff' : '#ffb03a';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = subSize * 0.25;
    const subY = atTop ? bandY + subSize * 1.6 : h - h * 0.155;
    // Letter-spaced subtitle, drawn one character at a time.
    const gap = subSize * 0.42;
    const total = [...sub].reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, -gap);
    let cx = w / 2 - total / 2;
    for (const ch of sub) {
      const cw = ctx.measureText(ch).width;
      ctx.fillText(ch, cx + cw / 2, subY);
      cx += cw + gap;
    }
    ctx.shadowBlur = 0;
  }
  if (!text) return;
  let size = h * 0.115 * (state.captionSize || 1);
  ctx.font = `900 ${size}px ${LETTER_FONT}`;
  while (ctx.measureText(text).width > maxW && size > 14) {
    size -= 2;
    ctx.font = `900 ${size}px ${LETTER_FONT}`;
  }
  const capY = atTop ? bandY + h * 0.115 : h - h * 0.045;
  const fill = ctx.createLinearGradient(0, capY - size, 0, capY + size * 0.15);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, state.captionColor || '#ffffff');
  fill.addColorStop(1, '#ffd9a0');
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,0,30,0.9)';
  ctx.lineWidth = size * 0.09;
  ctx.shadowColor = 'rgba(255, 30, 120, 0.55)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, w / 2, capY);
  ctx.fillStyle = fill;
  ctx.fillText(text, w / 2, capY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draw the whole cover for `state` onto `ctx` at size w x h.
 * state: { layout, grade, caption, subtitle, captionColor, captionSize,
 *          captionPos, panels: [{ img, zoom, ox, oy }] }.
 * A panel's img may be an HTMLImageElement, a canvas, or null (drawn as a
 * procedural sunset so the cover never shows an empty hole).
 */
export function drawCover(ctx, state, w, h) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.clearRect(0, 0, w, h);
  // White poster board: the gutters between panels.
  ctx.fillStyle = '#f7f2ea';
  ctx.fillRect(0, 0, w, h);
  const rects = layout.rects(w, h);
  for (let i = 0; i < rects.length; i++) {
    const panel = state.panels[i] || { zoom: 1, ox: 0, oy: 0 };
    const img = panel.img;
    if (img) {
      clampPan(panel, rects[i], img.naturalWidth || img.width, img.naturalHeight || img.height);
      drawPanelPhoto(ctx, img, panel, rects[i]);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rects[i].x, rects[i].y, rects[i].w, rects[i].h);
      ctx.clip();
      drawProceduralSunset(ctx, rects[i].x, rects[i].y, rects[i].w, rects[i].h, i + 1);
      ctx.restore();
    }
  }
  // The colour grade: a warm or neon wash over the panels.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(0.5, grade.mid);
  wash.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // A low sun glow, top-left for sunset grades, bottom-right for neon.
  const glowX = state.grade === 'neon' ? w * 0.82 : w * 0.2;
  const glowY = state.grade === 'neon' ? h * 0.85 : h * 0.18;
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, w * 0.45);
  glow.addColorStop(0, grade.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  drawGrainAndVignette(ctx, w, h, 7);
  drawCaption(ctx, state, w, h);
}

/**
 * A procedural sunset scene drawn straight onto the canvas, used when a
 * sample photo is missing: gradient sky, a low sun, a sea band and palm
 * silhouettes. `seed` varies the palm placement.
 */
export function drawProceduralSunset(ctx, x, y, w, h, seed = 1) {
  ctx.save();
  ctx.translate(x, y);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#2b1a5e');
  sky.addColorStop(0.45, '#c94b7c');
  sky.addColorStop(0.8, '#ff8a3d');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.62);
  // Sun.
  const sunR = Math.min(w, h) * 0.11;
  const sun = ctx.createRadialGradient(w * 0.68, h * 0.42, 0, w * 0.68, h * 0.42, sunR * 2.4);
  sun.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  sun.addColorStop(0.4, 'rgba(255, 190, 90, 0.55)');
  sun.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h * 0.62);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.42, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Sea.
  const sea = ctx.createLinearGradient(0, h * 0.62, 0, h);
  sea.addColorStop(0, '#e8703f');
  sea.addColorStop(0.5, '#7a2d6e');
  sea.addColorStop(1, '#241040');
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.5)';
  ctx.lineWidth = Math.max(1, h * 0.004);
  const rand = seededRandom(seed * 31 + 5);
  for (let i = 0; i < 7; i++) {
    const yy = h * (0.66 + rand() * 0.28);
    const xx = rand() * w * 0.7;
    const len = w * (0.08 + rand() * 0.22);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + len, yy);
    ctx.stroke();
  }
  // Palm silhouettes.
  ctx.fillStyle = '#1c0b28';
  for (const px of [w * 0.12, w * 0.9]) {
    const trunkH = h * 0.34;
    const baseY = h * 0.66;
    ctx.save();
    ctx.translate(px, baseY);
    ctx.rotate(px < w / 2 ? 0.1 : -0.12);
    ctx.fillRect(-w * 0.008, -trunkH, w * 0.016, trunkH);
    for (let f = 0; f < 5; f++) {
      const ang = -Math.PI * (0.15 + f * 0.14);
      ctx.save();
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(-w * 0.07, 0, w * 0.075, h * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}
