import { GAME, MOCHI_TYPES } from "./config.js";
import { clamp, easeOutBack, rand } from "./utils.js";
import { drawMochi } from "./mochi-art.js";

const B = GAME.basket;

function roundRectPath(context, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

export class Stage {
  constructor(canvas, background) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.background = background;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.vignette = null;
  }

  resize(topInset, bottomInset) {
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const availableHeight = Math.max(150, this.height - topInset - bottomInset);
    const availableWidth = Math.max(160, this.width - 18);
    this.scale = Math.min(
      availableWidth / GAME.worldWidth,
      availableHeight / GAME.worldHeight,
    );
    this.offsetX = (this.width - GAME.worldWidth * this.scale) / 2;
    this.offsetY = topInset + (availableHeight - GAME.worldHeight * this.scale) / 2;

    this.background.resize(this.width, this.height);
    this.vignette = null;
  }

  screenToWorldX(clientX) {
    return (clientX - this.offsetX) / this.scale;
  }

  render(now, view) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    this.background.draw(ctx);

    const time = now / 1000;
    const shakeX = view.shake > 0 ? rand(-view.shake, view.shake) * 0.45 : 0;
    const shakeY = view.shake > 0 ? rand(-view.shake, view.shake) * 0.45 : 0;

    ctx.save();
    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.scale(this.scale, this.scale);

    this.drawBackdrop();
    this.drawBasketShadow();
    this.drawBasketBack();
    this.drawDangerZone(time, view.mode, view.dangerTimer);
    this.drawBodies(view.bodies, time);
    this.drawBasketFront();
    if (view.mode === "playing") this.drawAimPreview(view, time);
    view.effects.draw(ctx);
    if (view.mode === "playing") this.drawDangerWarning(view.dangerTimer, time);

    ctx.restore();
    this.drawVignette();
  }

  drawBackdrop() {
    const { ctx } = this;
    const centerX = (B.left + B.right) / 2;
    const shadow = ctx.createRadialGradient(
      centerX,
      B.bottomY + 40,
      30,
      centerX,
      B.bottomY + 20,
      340,
    );
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    shadow.addColorStop(0.52, "rgba(0, 0, 0, 0.18)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(centerX, B.bottomY + 34, 345, 86, 0, 0, Math.PI * 2);
    ctx.fill();

    const warm = ctx.createRadialGradient(
      centerX,
      B.bottomY - 220,
      20,
      centerX,
      B.bottomY - 220,
      390,
    );
    warm.addColorStop(0, "rgba(255, 226, 166, 0.09)");
    warm.addColorStop(0.55, "rgba(255, 215, 148, 0.035)");
    warm.addColorStop(1, "rgba(255, 215, 148, 0)");
    ctx.fillStyle = warm;
    ctx.fillRect(B.left - 240, B.rimY - 200, 900, 800);
  }

  drawInteriorPath() {
    const { ctx } = this;
    const r = 28;
    ctx.beginPath();
    ctx.moveTo(B.left, B.rimY);
    ctx.lineTo(B.left, B.bottomY - r);
    ctx.quadraticCurveTo(B.left, B.bottomY, B.left + r, B.bottomY);
    ctx.lineTo(B.right - r, B.bottomY);
    ctx.quadraticCurveTo(B.right, B.bottomY, B.right, B.bottomY - r);
    ctx.lineTo(B.right, B.rimY);
    ctx.closePath();
  }

  drawBasketShadow() {
    const { ctx } = this;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 12;
    roundRectPath(
      ctx,
      B.left - B.wall - 4,
      B.rimY - 8,
      B.right - B.left + (B.wall + 4) * 2,
      B.bottomY - B.rimY + B.wall + 34,
      18,
    );
    ctx.fillStyle = "rgba(43, 24, 22, 0.35)";
    ctx.fill();
    ctx.restore();
  }

  drawBasketBack() {
    const { ctx } = this;
    this.drawInteriorPath();
    const interior = ctx.createLinearGradient(0, B.rimY, 0, B.bottomY);
    interior.addColorStop(0, "rgba(29, 20, 34, 0.55)");
    interior.addColorStop(0.46, "rgba(68, 42, 35, 0.42)");
    interior.addColorStop(1, "rgba(111, 67, 43, 0.35)");
    ctx.fillStyle = interior;
    ctx.fill();

    ctx.save();
    this.drawInteriorPath();
    ctx.clip();

    const floorGlow = ctx.createRadialGradient(
      (B.left + B.right) / 2,
      B.bottomY - 20,
      10,
      (B.left + B.right) / 2,
      B.bottomY - 20,
      250,
    );
    floorGlow.addColorStop(0, "rgba(255, 200, 118, 0.1)");
    floorGlow.addColorStop(1, "rgba(255, 200, 118, 0)");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(B.left, B.bottomY - 300, B.right - B.left, 320);

    for (let y = B.rimY + 36; y < B.bottomY; y += 52) {
      ctx.strokeStyle = "rgba(255, 231, 188, 0.035)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(B.left, y);
      ctx.lineTo(B.right, y);
      ctx.stroke();
    }
    for (let x = B.left + 34; x < B.right; x += 64) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.055)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, B.rimY);
      ctx.lineTo(x, B.bottomY);
      ctx.stroke();
    }
    ctx.restore();

    const rimGlow = ctx.createLinearGradient(B.left, B.rimY, B.right, B.rimY);
    rimGlow.addColorStop(0, "rgba(255, 228, 180, 0.02)");
    rimGlow.addColorStop(0.5, "rgba(255, 228, 180, 0.12)");
    rimGlow.addColorStop(1, "rgba(255, 228, 180, 0.02)");
    ctx.fillStyle = rimGlow;
    ctx.fillRect(B.left, B.rimY - 1, B.right - B.left, 2);
  }

  drawDangerZone(time, mode, dangerTimer) {
    if (mode !== "playing") return;
    const { ctx } = this;
    const progress = clamp(dangerTimer / GAME.dangerLimit, 0, 1);
    const zone = ctx.createLinearGradient(0, B.rimY, 0, GAME.dangerY);
    zone.addColorStop(0, `rgba(230, 102, 101, ${0.02 + progress * 0.12})`);
    zone.addColorStop(1, `rgba(230, 102, 101, ${0.01 + progress * 0.08})`);
    ctx.fillStyle = zone;
    ctx.fillRect(B.left, B.rimY, B.right - B.left, GAME.dangerY - B.rimY);

    ctx.save();
    ctx.setLineDash([4, 9]);
    ctx.strokeStyle = `rgba(255, 226, 160, ${0.32 + progress * 0.5 + Math.sin(time * 4) * 0.04})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(B.left + 8, GAME.dangerY);
    ctx.lineTo(B.right - 8, GAME.dangerY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.42 + progress * 0.45;
    ctx.fillStyle = "#f5d99a";
    ctx.font = '600 9px "Nunito", "PingFang SC", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText("月光线", B.right - 12, GAME.dangerY - 8);
    ctx.restore();
  }

  drawBambooWall(x, widthPx, isLeft) {
    const { ctx } = this;
    const y = B.rimY - 8;
    const h = B.bottomY - B.rimY + 26;
    const grad = ctx.createLinearGradient(x, 0, x + widthPx, 0);
    if (isLeft) {
      grad.addColorStop(0, "#9c6439");
      grad.addColorStop(0.36, "#d49a59");
      grad.addColorStop(0.78, "#c1854a");
      grad.addColorStop(1, "#8b5732");
    } else {
      grad.addColorStop(0, "#8b5732");
      grad.addColorStop(0.24, "#c1854a");
      grad.addColorStop(0.62, "#d49a59");
      grad.addColorStop(1, "#9c6439");
    }
    roundRectPath(ctx, x, y, widthPx, h, 8);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(62, 35, 24, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    roundRectPath(ctx, x, y, widthPx, h, 8);
    ctx.clip();
    ctx.strokeStyle = "rgba(76, 42, 26, 0.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const nx = x + 4 + (i * (widthPx - 8)) / 3;
      ctx.beginPath();
      ctx.moveTo(nx, y + 4);
      ctx.lineTo(nx + (isLeft ? -2 : 2), y + h - 4);
      ctx.stroke();
    }

    const topBand = ctx.createLinearGradient(0, y, 0, y + 12);
    topBand.addColorStop(0, "rgba(255, 220, 166, 0.22)");
    topBand.addColorStop(1, "rgba(90, 48, 25, 0.14)");
    ctx.fillStyle = topBand;
    ctx.fillRect(x, y, widthPx, 12);
    ctx.fillStyle = "rgba(63, 35, 23, 0.28)";
    ctx.fillRect(x, y + 12, widthPx, 2);
    ctx.fillStyle = "rgba(255, 230, 186, 0.18)";
    ctx.fillRect(x, B.bottomY - 9, widthPx, 3);
    ctx.restore();
  }

  drawBasketFront() {
    const { ctx } = this;
    this.drawBambooWall(B.left - B.wall, B.wall, true);
    this.drawBambooWall(B.right, B.wall, false);

    for (const x of [B.left - B.wall, B.right]) {
      const grad = ctx.createLinearGradient(0, B.rimY - 14, 0, B.rimY + 4);
      grad.addColorStop(0, "#e7b374");
      grad.addColorStop(1, "#9d6439");
      roundRectPath(ctx, x - 3, B.rimY - 15, B.wall + 6, 17, 8);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(72, 40, 24, 0.38)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const bandY = B.bottomY - 3;
    const bandH = 26;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    band.addColorStop(0, "#c7894d");
    band.addColorStop(0.48, "#a66a3c");
    band.addColorStop(1, "#86512f");
    roundRectPath(
      ctx,
      B.left - B.wall - 4,
      bandY,
      B.right - B.left + (B.wall + 4) * 2,
      bandH,
      9,
    );
    ctx.fillStyle = band;
    ctx.fill();
    ctx.strokeStyle = "rgba(55, 29, 19, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 224, 173, 0.16)";
    ctx.lineWidth = 1;
    for (let x = B.left - B.wall; x < B.right + B.wall; x += 33) {
      ctx.beginPath();
      ctx.moveTo(x, bandY + 3);
      ctx.lineTo(x + 2, bandY + bandH - 3);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(242, 201, 126, 0.24)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(B.left - B.wall + 2, bandY + 6);
    ctx.lineTo(B.right + B.wall - 2, bandY + 6);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const sealX = (B.left + B.right) / 2;
    const sealY = bandY + 13;
    ctx.fillStyle = "#9d4035";
    roundRectPath(ctx, sealX - 15, sealY - 9, 30, 18, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 218, 178, 0.25)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 231, 200, 0.92)";
    ctx.font = '700 9px "STKaiti", "KaiTi", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("月兔", sealX, sealY + 0.5);
    ctx.restore();

    const ropeX = B.right + B.wall + 5;
    const ropeY = B.rimY + 26;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 221, 164, 0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(B.right + 2, B.rimY + 4);
    ctx.quadraticCurveTo(ropeX + 5, B.rimY + 10, ropeX, ropeY);
    ctx.stroke();
    ctx.fillStyle = "#c0584a";
    ctx.beginPath();
    ctx.arc(ropeX, ropeY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(232, 145, 101, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ropeX, ropeY + 4);
    ctx.lineTo(ropeX + 1, ropeY + 23);
    ctx.moveTo(ropeX + 2, ropeY + 4);
    ctx.lineTo(ropeX + 5, ropeY + 21);
    ctx.stroke();
    ctx.restore();
  }

  drawBodies(bodies, time) {
    const { ctx } = this;
    const sorted = bodies.slice().sort((a, b) => a.position.y - b.position.y);
    for (const body of sorted) {
      if (body.removed) continue;
      const age = time - body.bornAt;
      const spawn = age < 0.28 ? 0.65 + easeOutBack(age / 0.28) * 0.35 : 1;
      const speed = Math.abs(body.velocity.y);
      const squash = clamp(speed * 0.009, 0, 0.1);
      const spec = MOCHI_TYPES[body.mochiLevel];
      drawMochi(
        ctx,
        body.mochiLevel,
        body.position.x,
        body.position.y,
        spec.radius,
        body.angle,
        time,
        {
          scale: spawn,
          squashX: 1 + squash,
          squashY: 1 - squash,
          sparkle: body.mochiLevel >= 7,
        },
      );
    }
  }

  drawAimPreview(view, time) {
    const { ctx } = this;
    const spec = MOCHI_TYPES[view.currentLevel];
    const x = clamp(view.aimX, B.left + spec.radius + 2, B.right - spec.radius - 2);
    const y = GAME.previewY + Math.sin(time * 2.2) * 2.4;
    const ready = view.dropCooldown <= 0;

    ctx.save();
    ctx.globalAlpha = ready ? 1 : 0.48;
    ctx.setLineDash([2.5, 8]);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = "rgba(255, 228, 173, 0.22)";
    ctx.beginPath();
    ctx.moveTo(x, y + spec.radius + 9);
    ctx.lineTo(x, GAME.dangerY - 8);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    if (!ready) ctx.globalAlpha = 0.58;
    drawMochi(ctx, view.currentLevel, x, y, spec.radius, 0, time, {
      scale: 1 + Math.sin(time * 2.2) * 0.012,
      sparkle: view.currentLevel >= 7,
    });
    if (ready) {
      ctx.globalAlpha = 0.64;
      ctx.strokeStyle = "rgba(255, 224, 154, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, spec.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDangerWarning(dangerTimer, time) {
    const { ctx } = this;
    const progress = clamp(dangerTimer / GAME.dangerLimit, 0, 1);
    if (progress <= 0.05) return;
    const x = (B.left + B.right) / 2;
    const y = GAME.dangerY + 22;
    const pulse = 0.7 + Math.sin(time * 8) * 0.3;
    ctx.save();
    ctx.globalAlpha = 0.4 + progress * 0.6;
    ctx.fillStyle = "rgba(64, 24, 30, 0.82)";
    roundRectPath(ctx, x - 76, y - 13, 152, 26, 13);
    ctx.fill();
    ctx.strokeStyle = `rgba(245, 170, 128, ${0.24 + pulse * 0.4})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffe4c0";
    ctx.font = '700 11px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("团子快溢出来啦", x, y + 0.5);
    ctx.restore();
  }

  drawVignette() {
    const { ctx } = this;
    if (!this.vignette) {
      const cx = this.width / 2;
      const cy = this.height * 0.48;
      const inner = Math.min(this.width, this.height) * 0.3;
      const outer = Math.hypot(this.width, this.height) * 0.62;
      this.vignette = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
      this.vignette.addColorStop(0, "rgba(4, 3, 13, 0)");
      this.vignette.addColorStop(0.7, "rgba(4, 3, 13, 0.1)");
      this.vignette.addColorStop(1, "rgba(4, 3, 13, 0.48)");
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
