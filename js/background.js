import { TAU, clamp, drawPetal, drawStar, rand } from "./utils.js";

export class NightSky {
  constructor() {
    this.w = 0;
    this.h = 0;
    this.time = 0;
    this.stars = [];
    this.petals = [];
    this.clouds = [];
    this.shootingStar = null;
    this.shootingTimer = 5;
    this.skyGradient = null;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.skyGradient = null;
    const count = clamp(Math.round((w * h) / 11000), 70, 190);
    this.stars = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      size: rand(0.5, 1.9),
      phase: rand(0, TAU),
      speed: rand(0.35, 1.4),
      bright: Math.random() < 0.08,
    }));
    this.petals = Array.from({ length: Math.round(clamp(w / 90, 8, 20)) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-7, 12),
      vy: rand(7, 17),
      size: rand(2.4, 5.4),
      rotation: rand(0, TAU),
      spin: rand(-0.5, 0.5),
      alpha: rand(0.25, 0.62),
      color: Math.random() < 0.25 ? "#ffd2c0" : "#f5dca0",
    }));
    this.clouds = [
      { x: w * 0.2, y: h * 0.22, width: Math.min(w, h) * 0.34, height: 28, speed: 0.9, alpha: 0.06 },
      { x: w * 0.76, y: h * 0.28, width: Math.min(w, h) * 0.45, height: 36, speed: -0.55, alpha: 0.055 },
      { x: w * 0.56, y: h * 0.09, width: Math.min(w, h) * 0.28, height: 22, speed: 0.4, alpha: 0.04 },
    ];
  }

  update(dt) {
    this.time += dt;
    for (const petal of this.petals) {
      petal.x += (petal.vx + Math.sin(this.time * 0.55 + petal.rotation) * 7) * dt;
      petal.y += petal.vy * dt;
      petal.rotation += petal.spin * dt;
      if (petal.y > this.h + 12) {
        petal.y = -12;
        petal.x = rand(0, this.w);
      }
      if (petal.x < -12) petal.x = this.w + 12;
      if (petal.x > this.w + 12) petal.x = -12;
    }

    this.shootingTimer -= dt;
    if (!this.shootingStar && this.shootingTimer <= 0) {
      this.shootingTimer = rand(7, 15);
      this.shootingStar = {
        x: rand(this.w * 0.2, this.w * 0.9),
        y: rand(0, this.h * 0.24),
        vx: rand(-220, -140),
        vy: rand(80, 150),
        life: 0.9,
        maxLife: 0.9,
      };
    }
    if (this.shootingStar) {
      this.shootingStar.life -= dt;
      this.shootingStar.x += this.shootingStar.vx * dt;
      this.shootingStar.y += this.shootingStar.vy * dt;
      if (this.shootingStar.life <= 0) this.shootingStar = null;
    }
  }

  draw(ctx) {
    const { w, h, time } = this;
    if (!this.skyGradient) {
      this.skyGradient = ctx.createLinearGradient(0, 0, 0, h);
      this.skyGradient.addColorStop(0, "#0c0a20");
      this.skyGradient.addColorStop(0.46, "#1b1535");
      this.skyGradient.addColorStop(0.76, "#2b1c3b");
      this.skyGradient.addColorStop(1, "#1b1227");
    }
    ctx.fillStyle = this.skyGradient;
    ctx.fillRect(0, 0, w, h);

    this.drawNebula(ctx);
    this.drawStars(ctx);
    this.drawMoon(ctx);
    this.drawClouds(ctx);
    this.drawShootingStar(ctx);
    this.drawMountains(ctx);
    this.drawBranches(ctx, time);
    this.drawPetals(ctx);
  }

  drawNebula(ctx) {
    const { w, h, time } = this;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const pools = [
      { x: w * 0.18, y: h * 0.42, radius: Math.min(w, h) * 0.4, color: [126, 100, 210], alpha: 0.09, phase: 0.5 },
      { x: w * 0.82, y: h * 0.62, radius: Math.min(w, h) * 0.48, color: [214, 128, 151], alpha: 0.06, phase: 2.4 },
      { x: w * 0.52, y: h * 0.18, radius: Math.min(w, h) * 0.3, color: [93, 180, 190], alpha: 0.055, phase: 4.1 },
    ];
    for (const pool of pools) {
      const drift = Math.sin(time * 0.05 + pool.phase) * 14;
      const gradient = ctx.createRadialGradient(
        pool.x + drift,
        pool.y,
        0,
        pool.x + drift,
        pool.y,
        pool.radius,
      );
      gradient.addColorStop(0, `rgba(${pool.color.join(",")}, ${pool.alpha})`);
      gradient.addColorStop(1, `rgba(${pool.color.join(",")}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(pool.x - pool.radius + drift, pool.y - pool.radius, pool.radius * 2, pool.radius * 2);
    }
    ctx.restore();
  }

  drawStars(ctx) {
    for (const star of this.stars) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(this.time * star.speed + star.phase));
      ctx.save();
      ctx.globalAlpha = twinkle;
      if (star.bright) {
        ctx.fillStyle = "#fff7dd";
        drawStar(ctx, star.x, star.y, star.size * 3.2, star.size * 0.8, 4);
        ctx.fill();
      } else {
        ctx.fillStyle = star.phase % 2 > 1 ? "#ffe7c4" : "#e5edff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawMoon(ctx) {
    const { w, h, time } = this;
    const radius = clamp(Math.min(w, h) * 0.135, 44, 126);
    const x = w * 0.73;
    const y = clamp(h * 0.16, 110, 190);
    const pulse = 1 + Math.sin(time * 0.3) * 0.012;

    ctx.save();
    const halo = ctx.createRadialGradient(x, y, radius * 0.6, x, y, radius * 2.4);
    halo.addColorStop(0, "rgba(255, 230, 167, 0.22)");
    halo.addColorStop(0.4, "rgba(255, 219, 151, 0.08)");
    halo.addColorStop(1, "rgba(255, 219, 151, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - radius * 2.4, y - radius * 2.4, radius * 4.8, radius * 4.8);

    ctx.globalAlpha = 0.92;
    const moon = ctx.createRadialGradient(
      x - radius * 0.28,
      y - radius * 0.32,
      radius * 0.1,
      x,
      y,
      radius,
    );
    moon.addColorStop(0, "#fff9e6");
    moon.addColorStop(0.55, "#ffe9b6");
    moon.addColorStop(1, "#efc879");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(x, y, radius * pulse, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * pulse, 0, TAU);
    ctx.clip();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#b68b4b";
    for (const [cx, cy, cr] of [
      [-0.25, -0.2, 0.14],
      [0.3, 0.12, 0.2],
      [-0.1, 0.42, 0.1],
      [0.05, -0.5, 0.075],
      [0.53, -0.32, 0.08],
    ]) {
      ctx.beginPath();
      ctx.arc(x + cx * radius, y + cy * radius, cr * radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // A tiny jade rabbit silhouette, resting on the moon
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#8a5f2d";
    ctx.translate(x + radius * 0.05, y + radius * 0.18);
    ctx.rotate(-0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.18, radius * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(radius * 0.14, -radius * 0.12, radius * 0.085, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(radius * 0.08, -radius * 0.31, radius * 0.035, radius * 0.12, -0.24, 0, TAU);
    ctx.ellipse(radius * 0.19, -radius * 0.31, radius * 0.035, radius * 0.12, 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  drawClouds(ctx) {
    for (const cloud of this.clouds) {
      const span = this.w + cloud.width;
      const drift = cloud.x + this.time * cloud.speed;
      const x = ((drift % span) + span) % span - cloud.width / 2;
      ctx.save();
      ctx.globalAlpha = cloud.alpha;
      ctx.fillStyle = "#f6e8ff";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(
          x + (i - 1.5) * cloud.width * 0.2,
          cloud.y + Math.sin(i * 1.7 + this.time * 0.2) * 3,
          cloud.width * (0.24 - Math.abs(i - 1.5) * 0.025),
          cloud.height * (0.7 + (i % 2) * 0.2),
          0,
          0,
          TAU,
        );
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawShootingStar(ctx) {
    if (!this.shootingStar) return;
    const star = this.shootingStar;
    const alpha = Math.sin((star.life / star.maxLife) * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    const gradient = ctx.createLinearGradient(star.x, star.y, star.x - star.vx * 0.3, star.y - star.vy * 0.3);
    gradient.addColorStop(0, "rgba(255, 248, 220, 0.9)");
    gradient.addColorStop(1, "rgba(255, 248, 220, 0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(star.x, star.y);
    ctx.lineTo(star.x - star.vx * 0.22, star.y - star.vy * 0.22);
    ctx.stroke();
    ctx.fillStyle = "#fff9de";
    ctx.beginPath();
    ctx.arc(star.x, star.y, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawMountains(ctx) {
    const { w, h } = this;
    ctx.save();
    ctx.fillStyle = "#171026";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.84);
    ctx.bezierCurveTo(w * 0.12, h * 0.76, w * 0.22, h * 0.9, w * 0.37, h * 0.84);
    ctx.bezierCurveTo(w * 0.52, h * 0.77, w * 0.62, h * 0.9, w * 0.76, h * 0.83);
    ctx.bezierCurveTo(w * 0.86, h * 0.77, w * 0.93, h * 0.83, w, h * 0.8);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(40, 27, 58, 0.72)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.9);
    ctx.bezierCurveTo(w * 0.18, h * 0.83, w * 0.29, h * 0.95, w * 0.46, h * 0.88);
    ctx.bezierCurveTo(w * 0.62, h * 0.82, w * 0.74, h * 0.94, w * 0.87, h * 0.88);
    ctx.quadraticCurveTo(w * 0.95, h * 0.85, w, h * 0.89);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBranches(ctx, time) {
    const { w, h } = this;
    const sway = Math.sin(time * 0.35) * 2.5;

    const drawBranch = (startX, startY, dirX, dirY, scale, flip) => {
      ctx.save();
      ctx.translate(startX, startY);
      ctx.scale(flip ? -1 : 1, 1);
      ctx.strokeStyle = "rgba(26, 18, 31, 0.86)";
      ctx.lineCap = "round";
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(38 * scale, 18 * scale, 82 * scale, 30 * scale, 126 * scale, 16 * scale);
      ctx.stroke();
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.moveTo(38 * scale, 15 * scale);
      ctx.quadraticCurveTo(55 * scale, 43 * scale, 72 * scale, 50 * scale);
      ctx.moveTo(82 * scale, 25 * scale);
      ctx.quadraticCurveTo(94 * scale, 55 * scale, 110 * scale, 66 * scale);
      ctx.stroke();

      const leaves = [
        [28, 8, -0.5],
        [58, 17, 0.4],
        [92, 19, -0.3],
        [120, 10, 0.6],
        [58, 42, 0.2],
        [100, 48, -0.4],
      ];
      for (const [x, y, angle] of leaves) {
        ctx.save();
        ctx.translate(x * scale, y * scale);
        ctx.rotate(angle + Math.sin(time * 0.5 + x) * 0.03);
        ctx.fillStyle = "rgba(26, 18, 31, 0.9)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * scale, 3.4 * scale, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      const flowers = [
        [38, 4],
        [76, 16],
        [112, 7],
        [70, 36],
      ];
      for (let i = 0; i < flowers.length; i += 1) {
        const [x, y] = flowers[i];
        ctx.save();
        ctx.translate(x * scale + sway, y * scale);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = i % 2 === 0 ? "#f7d98e" : "#f3c875";
        for (let p = 0; p < 4; p += 1) {
          ctx.save();
          ctx.rotate((p / 4) * TAU);
          ctx.beginPath();
          ctx.ellipse(0, -2.8 * scale, 1.5 * scale, 2.8 * scale, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#d79a42";
        ctx.beginPath();
        ctx.arc(0, 0, 1.2 * scale, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    drawBranch(-12, h * 0.08, 1, 1, 1.1, false);
    drawBranch(w + 8, h * 0.17, -1, 1, 0.9, true);
  }

  drawPetals(ctx) {
    for (const petal of this.petals) {
      ctx.save();
      ctx.globalAlpha = petal.alpha;
      ctx.fillStyle = petal.color;
      drawPetal(ctx, petal.x, petal.y, petal.size, petal.rotation);
      ctx.fill();
      ctx.restore();
    }
  }
}
