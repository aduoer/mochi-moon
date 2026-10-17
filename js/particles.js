import { TAU, drawPetal, drawStar, pick, rand } from "./utils.js";

const MAX_PARTICLES = 230;

export class Effects {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  add(particle) {
    if (this.items.length >= MAX_PARTICLES) return;
    this.items.push({
      kind: "spark",
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      size: 4,
      rotation: 0,
      spin: 0,
      life: 0.7,
      maxLife: 0.7,
      color: "#ffe8b0",
      alpha: 1,
      text: "",
      ...particle,
      maxLife: particle.life ?? 0.7,
    });
  }

  mergeBurst(x, y, spec, level, text = "") {
    const count = 9 + level * 2;
    for (let i = 0; i < count; i += 1) {
      const angle = rand(-Math.PI, 0);
      const speed = rand(60, 190 + level * 18);
      this.add({
        kind: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 250,
        drag: 0.985,
        size: rand(2.4, 6.5),
        rotation: rand(0, TAU),
        spin: rand(-5, 5),
        life: rand(0.4, 0.85),
        color: pick([spec.body, spec.accent, "#fff8df", "#ffd887"]),
      });
    }

    for (let i = 0; i < 4; i += 1) {
      this.add({
        kind: "petal",
        x: x + rand(-12, 12),
        y: y + rand(-8, 8),
        vx: rand(-55, 55),
        vy: rand(-115, -35),
        gravity: 150,
        drag: 0.99,
        size: rand(3, 6.5),
        rotation: rand(0, TAU),
        spin: rand(-4, 4),
        life: rand(0.8, 1.35),
        color: pick(["#ffe6b4", spec.body, "#ffd2c4"]),
      });
    }

    this.add({
      kind: "ring",
      x,
      y,
      size: 8,
      grow: 70 + level * 12,
      life: 0.48,
      color: level >= 6 ? "rgba(255, 233, 173, 0.8)" : "rgba(255, 242, 208, 0.62)",
    });

    if (text) {
      this.add({
        kind: "text",
        x,
        y: y - 18,
        vy: -48,
        life: 0.9,
        size: level >= 6 ? 25 : 19,
        color: level >= 6 ? "#ffe59b" : "#fff6dc",
        stroke: "rgba(56, 32, 44, 0.6)",
        text,
      });
    }
  }

  supernova(x, y, text = "") {
    for (let i = 0; i < 48; i += 1) {
      const angle = rand(0, TAU);
      const speed = rand(80, 420);
      this.add({
        kind: i % 4 === 0 ? "petal" : "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: i % 4 === 0 ? 80 : 160,
        drag: 0.986,
        size: rand(3, 8),
        rotation: rand(0, TAU),
        spin: rand(-6, 6),
        life: rand(0.7, 1.6),
        color: pick(["#fff8dc", "#ffe29a", "#ffc86b", "#ffdfd3", "#f6b9a6"]),
      });
    }
    for (let i = 0; i < 3; i += 1) {
      this.add({
        kind: "ring",
        x,
        y,
        vx: 0,
        vy: 0,
        size: 20 + i * 12,
        grow: 520,
        life: 0.9 + i * 0.13,
        color: `rgba(255, 235, 180, ${0.65 - i * 0.15})`,
      });
    }
    if (text) {
      this.add({
        kind: "text",
        x,
        y: y - 20,
        vy: -30,
        life: 1.4,
        size: 34,
        color: "#fff2b8",
        stroke: "rgba(92, 48, 35, 0.7)",
        text,
      });
    }
  }

  dropPuff(x, y) {
    for (let i = 0; i < 3; i += 1) {
      this.add({
        kind: "steam",
        x: x + rand(-10, 10),
        y,
        vx: rand(-24, 24),
        vy: rand(-50, -22),
        size: rand(8, 14),
        grow: 22,
        life: rand(0.55, 0.9),
        color: "rgba(255, 244, 216, 0.34)",
      });
    }
  }

  steam(x, y) {
    this.add({
      kind: "steam",
      x,
      y,
      vx: rand(-6, 6),
      vy: rand(-24, -12),
      size: rand(9, 17),
      grow: 28,
      life: rand(1.5, 2.6),
      color: "rgba(255, 245, 222, 0.18)",
    });
  }

  sparkle(x, y, color = "#ffe7ad") {
    this.add({
      kind: "spark",
      x,
      y,
      vx: rand(-18, 18),
      vy: rand(-35, -8),
      gravity: 10,
      size: rand(1.6, 3.4),
      rotation: rand(0, TAU),
      spin: rand(-3, 3),
      life: rand(0.5, 1),
      color,
    });
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        items.splice(i, 1);
        continue;
      }
      if (p.kind === "ring") {
        p.size += p.grow * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
        continue;
      }
      if (p.kind === "steam") {
        p.x += (p.vx + Math.sin(p.life * 4) * 5) * dt;
        p.y += p.vy * dt;
        p.size += p.grow * dt;
        p.alpha = Math.min(1, p.life / p.maxLife) * 0.9;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      if (p.kind === "petal") {
        p.x += Math.sin(p.life * 6 + p.rotation) * 16 * dt;
        p.rotation += p.spin * dt;
      }
      if (p.kind === "text") p.vy *= 0.97;
      p.alpha = Math.min(1, (p.life / p.maxLife) * 2);
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      ctx.save();
      ctx.globalAlpha = p.alpha ?? 1;
      if (p.kind === "spark") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        drawStar(ctx, 0, 0, p.size, p.size * 0.28, 4);
        ctx.fill();
      } else if (p.kind === "petal") {
        ctx.fillStyle = p.color;
        drawPetal(ctx, p.x, p.y, p.size, p.rotation);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.stroke();
      } else if (p.kind === "steam") {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "rgba(255, 244, 216, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.kind === "text") {
        ctx.font = `800 ${p.size}px "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = p.stroke;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.restore();
    }
  }
}
