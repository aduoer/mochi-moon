import { MOCHI_TYPES } from "./config.js";
import { TAU } from "./utils.js";

const SILHOUETTE = "#5a4038";

function drawBody(ctx, spec, radius) {
  const gradient = ctx.createRadialGradient(
    -radius * 0.34,
    -radius * 0.42,
    radius * 0.04,
    0,
    radius * 0.14,
    radius * 1.08,
  );
  gradient.addColorStop(0, lighten(spec.body));
  gradient.addColorStop(0.48, spec.body);
  gradient.addColorStop(0.84, spec.body);
  gradient.addColorStop(1, spec.shade);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Soft lower-edge shading
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();
  const lower = ctx.createLinearGradient(0, radius * 0.2, 0, radius);
  lower.addColorStop(0, "rgba(74, 45, 40, 0)");
  lower.addColorStop(1, "rgba(74, 45, 40, 0.18)");
  ctx.fillStyle = lower;
  ctx.fillRect(-radius, 0, radius * 2, radius);
  ctx.restore();

  // Rim light
  ctx.beginPath();
  ctx.arc(0, 0, radius - Math.max(1, radius * 0.025), 0.35, 2.55);
  ctx.strokeStyle = "rgba(255, 252, 235, 0.45)";
  ctx.lineWidth = Math.max(1.1, radius * 0.045);
  ctx.lineCap = "round";
  ctx.stroke();

  // Outline
  ctx.beginPath();
  ctx.arc(0, 0, radius - Math.max(0.7, radius * 0.018), 0, TAU);
  ctx.strokeStyle = "rgba(72, 45, 42, 0.28)";
  ctx.lineWidth = Math.max(1, radius * 0.035);
  ctx.stroke();

  // Flour speckles
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.clip();
  ctx.fillStyle = "rgba(255, 255, 245, 0.36)";
  const speckles = [
    [-0.43, -0.1, 0.022],
    [0.34, -0.42, 0.016],
    [-0.12, 0.5, 0.015],
    [0.55, 0.3, 0.012],
  ];
  for (const [x, y, size] of speckles) {
    ctx.beginPath();
    ctx.arc(x * radius, y * radius, Math.max(0.6, size * radius), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Specular highlight
  ctx.save();
  ctx.globalAlpha = 0.37;
  ctx.translate(-radius * 0.36, -radius * 0.44);
  ctx.rotate(-0.55);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.27, radius * 0.12, 0, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

function drawFace(ctx, spec, radius, level) {
  const eyeY = radius * 0.03;
  const eyeDx = radius * 0.27;
  const eyeR = Math.max(1.5, radius * 0.072);
  const happy = level >= 7;

  ctx.fillStyle = SILHOUETTE;
  ctx.strokeStyle = SILHOUETTE;
  ctx.lineCap = "round";

  for (const side of [-1, 1]) {
    if (happy) {
      ctx.beginPath();
      ctx.lineWidth = Math.max(1.2, radius * 0.038);
      ctx.arc(side * eyeDx, eyeY + eyeR * 0.4, eyeR * 1.18, Math.PI + 0.42, TAU - 0.42);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(side * eyeDx, eyeY, eyeR, eyeR * 1.16, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath();
      ctx.arc(side * eyeDx + eyeR * 0.3, eyeY - eyeR * 0.36, eyeR * 0.28, 0, TAU);
      ctx.fill();
      ctx.fillStyle = SILHOUETTE;
    }
  }

  // Blush
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = spec.blush;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.49, radius * 0.22, radius * 0.14, radius * 0.075, -0.25, 0, TAU);
  ctx.ellipse(radius * 0.49, radius * 0.22, radius * 0.14, radius * 0.075, 0.25, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Nose
  ctx.fillStyle = "#c97c75";
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.12, Math.max(0.8, radius * 0.035), Math.max(0.6, radius * 0.026), 0, 0, TAU);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = "rgba(90, 58, 50, 0.8)";
  ctx.lineWidth = Math.max(0.9, radius * 0.026);
  ctx.beginPath();
  if (level >= 5) {
    ctx.arc(0, radius * 0.16, radius * 0.08, 0.2, Math.PI - 0.2);
  } else {
    ctx.moveTo(0, radius * 0.17);
    ctx.quadraticCurveTo(-radius * 0.05, radius * 0.23, -radius * 0.11, radius * 0.18);
    ctx.moveTo(0, radius * 0.17);
    ctx.quadraticCurveTo(radius * 0.05, radius * 0.23, radius * 0.11, radius * 0.18);
  }
  ctx.stroke();
}

function drawSakura(ctx, x, y, radius, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.rotate((i / 5) * TAU);
    ctx.fillStyle = i % 2 === 0 ? "#fff6ee" : "#ffd1da";
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.7, radius * 0.42, radius * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#e9aa58";
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.33, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTinyFlower(ctx, x, y, radius, petal, center) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = petal;
  for (let i = 0; i < 4; i += 1) {
    ctx.save();
    ctx.rotate((i / 4) * TAU);
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.72, radius * 0.35, radius * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.36, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSurfaceToppings(ctx, spec, level, radius, time) {
  if (level === 1) {
    drawSakura(ctx, radius * 0.28, -radius * 0.68, radius * 0.3, Math.sin(time * 0.7) * 0.15);
  } else if (level === 2) {
    ctx.save();
    ctx.strokeStyle = "#6e9c5d";
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.25, -radius * 0.63);
    ctx.quadraticCurveTo(-radius * 0.1, -radius * 0.88, radius * 0.1, -radius * 0.67);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(94, 135, 73, 0.5)";
    for (const [x, y, size] of [
      [-0.55, -0.3, 0.035],
      [0.42, -0.48, 0.03],
      [0.6, 0.14, 0.025],
      [-0.35, 0.55, 0.024],
    ]) {
      ctx.beginPath();
      ctx.arc(x * radius, y * radius, Math.max(0.5, size * radius), 0, TAU);
      ctx.fill();
    }
  } else if (level === 3) {
    drawTinyFlower(ctx, -radius * 0.34, -radius * 0.62, radius * 0.19, "#fff5d0", "#e7a638");
    drawTinyFlower(ctx, radius * 0.26, -radius * 0.72, radius * 0.15, "#fff8e3", "#d99b2d");
  } else if (level === 4) {
    ctx.save();
    ctx.translate(radius * 0.42, -radius * 0.6);
    ctx.rotate(-0.4);
    const bean = ctx.createLinearGradient(0, -radius * 0.2, 0, radius * 0.2);
    bean.addColorStop(0, "#b15b55");
    bean.addColorStop(1, "#753d3b");
    ctx.fillStyle = bean;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.22, radius * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 231, 206, 0.42)";
    ctx.lineWidth = Math.max(0.8, radius * 0.018);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.09, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();
  } else if (level === 5) {
    ctx.fillStyle = "rgba(255, 244, 220, 0.82)";
    for (const [x, y, size] of [
      [-0.43, -0.45, 0.03],
      [0.3, -0.66, 0.026],
      [0.55, -0.18, 0.024],
      [-0.6, 0.12, 0.022],
      [0.12, -0.32, 0.02],
      [0.4, 0.46, 0.018],
    ]) {
      ctx.save();
      ctx.translate(x * radius, y * radius);
      ctx.rotate(x * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(0.7, size * radius * 1.8), Math.max(0.5, size * radius), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  } else if (level === 7) {
    drawGoldenHalo(ctx, radius, time);
    drawSakura(ctx, -radius * 0.5, -radius * 0.56, radius * 0.14, -0.3);
  } else if (level === 8) {
    drawGoldenHalo(ctx, radius, time);
    for (let i = 0; i < 4; i += 1) {
      const angle = time * 0.35 + (i / 4) * TAU;
      const orbit = radius * 1.2;
      const x = Math.cos(angle) * orbit;
      const y = Math.sin(angle) * orbit * 0.62;
      const twinkle = 0.55 + Math.sin(time * 2.4 + i * 1.7) * 0.35;
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = "#ffeab2";
      ctx.translate(x, y);
      ctx.rotate(angle);
      drawStarShape(ctx, 0, 0, radius * 0.075, radius * 0.025);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawRabbitEars(ctx, radius) {
  ctx.save();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * radius * 0.34, -radius * 0.98);
    ctx.rotate(side * 0.2);
    ctx.fillStyle = "#fff7e8";
    ctx.strokeStyle = "rgba(95, 66, 56, 0.22)";
    ctx.lineWidth = Math.max(1, radius * 0.025);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.17, radius * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4c4c0";
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.06, radius * 0.075, radius * 0.27, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawGoldenHalo(ctx, radius, time) {
  const pulse = 0.5 + Math.sin(time * 1.8) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.2 + pulse * 0.14;
  ctx.strokeStyle = "#ffe7a4";
  ctx.lineWidth = Math.max(1, radius * 0.02);
  ctx.setLineDash([radius * 0.12, radius * 0.13]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.14, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#fff5cc";
  ctx.beginPath();
  ctx.arc(radius * 0.67, -radius * 0.64, radius * 0.105, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawStarShape(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / 8) * TAU - Math.PI / 2;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
}

export function drawMochi(ctx, level, x, y, radius, angle, time, options = {}) {
  const spec = MOCHI_TYPES[level];
  const scale = options.scale ?? 1;
  const squashX = options.squashX ?? 1;
  const squashY = options.squashY ?? 1;
  const glow = options.glow !== false;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale * squashX, scale * squashY);

  if (glow && level >= 5) {
    const glowRadius = radius * (level >= 8 ? 1.62 : 1.32);
    const aura = ctx.createRadialGradient(0, 0, radius * 0.75, 0, 0, glowRadius);
    aura.addColorStop(0, spec.glow);
    aura.addColorStop(1, "rgba(255, 236, 190, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, TAU);
    ctx.fill();
  }

  // Cast shadow on the basket floor
  if (options.shadow !== false) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#2f1d1e";
    ctx.beginPath();
    ctx.ellipse(radius * 0.1, radius * 0.17, radius * 0.95, radius * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (level === 6) drawRabbitEars(ctx, radius);
  drawBody(ctx, spec, radius);
  drawSurfaceToppings(ctx, spec, level, radius, time);
  drawFace(ctx, spec, radius, level);

  if (options.sparkle && level >= 7) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#fff8dc";
    drawStarShape(ctx, -radius * 0.7, -radius * 0.62, radius * 0.09, radius * 0.025);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawMochiPreview(ctx, level, width, height, time) {
  const spec = MOCHI_TYPES[level];
  const radius = Math.min(width, height) * 0.31;
  const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.55);
  glow.addColorStop(0, spec.glow);
  glow.addColorStop(1, "rgba(255, 240, 200, 0)");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  drawMochi(ctx, level, width / 2, height / 2 + height * 0.04, radius, 0, time, {
    glow: false,
    shadow: false,
    sparkle: level >= 7,
  });
}

function lighten(hex) {
  const value = hex.replace("#", "");
  const int = parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgb(${Math.min(255, r + 18)}, ${Math.min(255, g + 16)}, ${Math.min(255, b + 12)})`;
}
