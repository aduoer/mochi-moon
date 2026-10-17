export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const rand = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(rand(min, max + 1));

export const pick = (items) => items[Math.floor(Math.random() * items.length)];

export const weightedPick = (entries) => {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return entries[0]?.value;
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1].value;
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};

export const formatNumber = (value) => Math.round(value).toLocaleString("zh-CN");

export const readNumber = (key, fallback = 0) => {
  try {
    const raw = window.localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

export const readBool = (key, fallback = true) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
};

export const writeValue = (key, value) => {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be unavailable in private browsing; gameplay is unaffected.
  }
};

export const drawStar = (ctx, x, y, outer, inner, points = 4) => {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * TAU - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

export const drawPetal = (ctx, x, y, size, rotation) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.72, size * 0.55, 0, size);
  ctx.bezierCurveTo(-size * 0.72, size * 0.55, -size * 0.8, -size * 0.5, 0, -size);
  ctx.closePath();
  ctx.restore();
};
