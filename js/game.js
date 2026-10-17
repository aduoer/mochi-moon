import {
  DROP_POOL,
  GAME,
  MAX_LEVEL,
  MOCHI_TYPES,
  RANKS,
} from "./config.js";
import {
  clamp,
  formatNumber,
  rand,
  readNumber,
  weightedPick,
  writeValue,
} from "./utils.js";
import { SoundKit } from "./audio.js";
import { NightSky } from "./background.js";
import { Effects } from "./particles.js";
import { drawMochiPreview } from "./mochi-art.js";
import { Stage } from "./stage.js";

const MatterLib = window.Matter;
if (!MatterLib) throw new Error("Matter.js failed to load.");
const { Engine, World, Bodies, Body, Composite, Events } = MatterLib;

const canvas = document.getElementById("scene");
const nextCanvas = document.getElementById("nextMochi");
const nextCtx = nextCanvas.getContext("2d");

const ui = {
  hud: document.getElementById("hud"),
  scoreValue: document.getElementById("scoreValue"),
  bestValue: document.getElementById("bestValue"),
  comboTag: document.getElementById("comboTag"),
  comboValue: document.getElementById("comboValue"),
  comboBar: document.getElementById("comboBar"),
  nextCard: document.getElementById("nextCard"),
  hint: document.getElementById("hint"),
  moment: document.getElementById("moment"),
  startOverlay: document.getElementById("startOverlay"),
  startBtn: document.getElementById("startBtn"),
  menuBest: document.getElementById("menuBest"),
  overOverlay: document.getElementById("overOverlay"),
  overTitle: document.getElementById("overTitle"),
  rankLine: document.getElementById("rankLine"),
  finalScore: document.getElementById("finalScore"),
  finalTier: document.getElementById("finalTier"),
  finalCombo: document.getElementById("finalCombo"),
  finalBest: document.getElementById("finalBest"),
  newBest: document.getElementById("newBest"),
  replayBtn: document.getElementById("replayBtn"),
  flash: document.getElementById("flash"),
  liveRegion: document.getElementById("liveRegion"),
};

const audio = new SoundKit();
const background = new NightSky();
const effects = new Effects();
const stage = new Stage(canvas, background);

const B = GAME.basket;
const FIXED_STEP = 1 / 60;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

const state = {
  mode: "menu",
  score: 0,
  best: Math.max(0, readNumber(GAME.scoreKey, 0)),
  currentLevel: 0,
  nextLevel: 1,
  aimX: (B.left + B.right) / 2,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  highestLevel: 0,
  dropCooldown: 0,
  dangerTimer: 0,
  shake: 0,
  hintTimer: 0,
  steamTimer: 1.5,
  paused: false,
  accumulator: 0,
  touchId: null,
};

const held = { left: false, right: false };
let lastFrame = performance.now();
let flashTimer = 0;
let overlayTimer = 0;
let momentTimer = 0;

const engine = Engine.create();
engine.gravity.y = 1.05;
engine.positionIterations = 10;
engine.velocityIterations = 8;
const world = engine.world;
const mochiBodies = [];
const pendingMerges = [];
const staticWalls = createWalls();
Composite.add(world, staticWalls);

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    if (!a.isMochi || !b.isMochi || a.removed || b.removed) continue;
    if (a.mochiLevel !== b.mochiLevel) continue;
    pendingMerges.push([a, b]);
  }
});

function createWalls() {
  const wall = B.wall;
  const top = -180;
  const bottom = B.bottomY + wall;
  const midY = (top + bottom) / 2;
  const sideHeight = bottom - top;
  const options = { isStatic: true, friction: 0.45, restitution: 0.06 };
  return [
    Bodies.rectangle(B.left - wall / 2, midY, wall, sideHeight, options),
    Bodies.rectangle(B.right + wall / 2, midY, wall, sideHeight, options),
    Bodies.rectangle(
      (B.left + B.right) / 2,
      B.bottomY + wall / 2,
      B.right - B.left + wall * 2,
      wall,
      options,
    ),
    Bodies.rectangle((B.left + B.right) / 2, -240, B.right - B.left, 24, options),
  ];
}

function rollDropLevel() {
  return weightedPick(DROP_POOL);
}

function clampAim() {
  const spec = MOCHI_TYPES[state.currentLevel];
  state.aimX = clamp(
    state.aimX,
    B.left + spec.radius + 2,
    B.right - spec.radius - 2,
  );
}

function setAim(worldX) {
  state.aimX = worldX;
  clampAim();
}

function startGame() {
  if (state.mode === "playing") return;
  window.clearTimeout(overlayTimer);
  audio.init();

  clearBodies();
  effects.clear();
  state.mode = "playing";
  state.score = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.maxCombo = 0;
  state.highestLevel = 0;
  state.dropCooldown = 0;
  state.dangerTimer = 0;
  state.shake = 0;
  state.hintTimer = 5;
  state.steamTimer = rand(0.8, 1.6);
  state.paused = false;
  state.accumulator = 0;
  state.touchId = null;
  state.aimX = (B.left + B.right) / 2;
  state.currentLevel = rollDropLevel();
  state.nextLevel = rollDropLevel();
  clampAim();
  held.left = false;
  held.right = false;

  if (
    document.activeElement instanceof HTMLElement &&
    document.activeElement.closest(".overlay")
  ) {
    document.activeElement.blur();
  }
  setOverlay(ui.startOverlay, false);
  setOverlay(ui.overOverlay, false);
  ui.hud.classList.add("is-visible");
  setHudInteractive(true);
  ui.nextCard.classList.remove("is-hidden");
  ui.hint.textContent = coarsePointer ? "拖动瞄准 · 松手投放" : "移动鼠标瞄准 · 点击投放";
  ui.hint.classList.add("is-visible");
  ui.comboTag.classList.remove("is-visible");
  ui.moment.classList.remove("is-visible");
  ui.flash.classList.remove("is-active");
  ui.newBest.classList.add("is-hidden");
  ui.scoreValue.classList.remove("is-popping");
  updateScoreUI();
  updateBestUI();
  updateComboUI();
  updateNextPreview();
  ui.liveRegion.textContent = "团子铺开门了，移动位置，点击投放团子。";
  audio.start();
}

function endGame() {
  if (state.mode !== "playing") return;
  state.mode = "over";
  state.combo = 0;
  state.comboTimer = 0;
  state.touchId = null;
  setHudInteractive(false);
  ui.comboTag.classList.remove("is-visible");
  ui.nextCard.classList.add("is-hidden");
  ui.hint.classList.remove("is-visible");

  const isNewBest = state.score > state.best;
  if (isNewBest) {
    state.best = state.score;
    writeValue(GAME.scoreKey, state.best);
  }
  updateBestUI();
  ui.finalScore.textContent = formatNumber(state.score);
  ui.finalTier.textContent = MOCHI_TYPES[state.highestLevel].name;
  ui.finalCombo.textContent = String(state.maxCombo);
  ui.finalBest.textContent = formatNumber(state.best);
  ui.newBest.classList.toggle("is-hidden", !isNewBest);
  const rank = RANKS.reduce(
    (current, entry) => (state.score >= entry.min ? entry : current),
    RANKS[0],
  );
  ui.rankLine.textContent = rank.text;
  ui.overTitle.textContent = isNewBest ? "月亮记得这一晚" : "今晚打烊啦";
  audio.gameOver();
  ui.liveRegion.textContent = `游戏结束，本局得分 ${state.score} 分，最高合成 ${MOCHI_TYPES[state.highestLevel].name}。`;

  overlayTimer = window.setTimeout(() => {
    if (state.mode !== "over") return;
    setOverlay(ui.overOverlay, true);
    ui.replayBtn.focus({ preventScroll: true });
    if (isNewBest) audio.newBest();
  }, 650);
}

function createMochi(level, x, y, velocity = { x: 0, y: 0 }) {
  const spec = MOCHI_TYPES[level];
  const body = Bodies.circle(x, y, spec.radius, {
    label: "mochi",
    restitution: 0.06,
    friction: 0.36,
    frictionAir: 0.012,
    density: 0.0012,
    slop: 0.02,
  });
  body.isMochi = true;
  body.mochiLevel = level;
  body.bornAt = performance.now() / 1000;
  body.removed = false;
  body.isMerging = false;
  Body.setVelocity(body, velocity);
  Body.setAngularVelocity(body, rand(-0.04, 0.04));
  World.add(world, body);
  mochiBodies.push(body);
  return body;
}

function removeMochi(body) {
  if (body.removed) return;
  body.removed = true;
  Composite.remove(world, body);
  const index = mochiBodies.indexOf(body);
  if (index >= 0) mochiBodies.splice(index, 1);
}

function clearBodies() {
  for (const body of [...mochiBodies]) removeMochi(body);
  pendingMerges.length = 0;
}

function dropCurrent() {
  if (state.mode !== "playing" || state.dropCooldown > 0) return;
  // A new drop starts a fresh chain; only cascades from this drop build combo.
  state.combo = 0;
  state.comboTimer = 0;
  ui.comboTag.classList.remove("is-visible");
  const spec = MOCHI_TYPES[state.currentLevel];
  const x = clamp(state.aimX, B.left + spec.radius + 2, B.right - spec.radius - 2);
  const y = GAME.previewY + 2;
  createMochi(state.currentLevel, x, y, { x: 0, y: 1.4 });
  audio.drop();
  effects.dropPuff(x, y + spec.radius * 0.7);
  state.dropCooldown = GAME.dropCooldown;
  state.currentLevel = state.nextLevel;
  state.nextLevel = rollDropLevel();
  clampAim();
  updateNextPreview();
}

function processMerges() {
  if (pendingMerges.length === 0) return;
  for (const [a, b] of pendingMerges) {
    if (a.removed || b.removed || a.isMerging || b.isMerging) continue;
    if (a.mochiLevel !== b.mochiLevel) continue;
    mergePair(a, b);
  }
  pendingMerges.length = 0;
}

function mergePair(a, b) {
  const level = a.mochiLevel;
  const x = (a.position.x + b.position.x) / 2;
  const y = (a.position.y + b.position.y) / 2;
  const vx = (a.velocity.x + b.velocity.x) * 0.35;
  const vy = Math.min((a.velocity.y + b.velocity.y) * 0.28, -0.5);
  a.isMerging = true;
  b.isMerging = true;
  removeMochi(a);
  removeMochi(b);

  state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
  state.comboTimer = GAME.comboWindow;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const multiplier = Math.min(5, state.combo);

  if (level >= MAX_LEVEL) {
    triggerSupernova(x, y, multiplier);
    return;
  }

  const newLevel = level + 1;
  createMochi(newLevel, x, y, { x: vx, y: vy });
  const spec = MOCHI_TYPES[newLevel];
  const points = Math.round(spec.score * multiplier);
  state.score += points;
  state.highestLevel = Math.max(state.highestLevel, newLevel);
  state.shake = Math.max(state.shake, newLevel >= 6 ? 8 : 3);
  effects.mergeBurst(x, y, spec, newLevel, `+${points}`);
  audio.merge(newLevel, state.combo);
  popScore();
  updateScoreUI();
  updateComboUI();
}

function triggerSupernova(x, y, multiplier) {
  const points = 1500 * multiplier;
  state.score += points;
  state.highestLevel = MAX_LEVEL;
  state.shake = 22;
  flashScreen();
  showMoment();
  effects.supernova(x, y, `+${points}`);
  audio.supernova();

  for (const body of [...mochiBodies]) {
    const distance = Math.hypot(body.position.x - x, body.position.y - y);
    if (distance < 290) removeMochi(body);
  }

  popScore();
  updateScoreUI();
  updateComboUI();
  ui.liveRegion.textContent = `满月当空，获得 ${points} 分。`;
}

function flashScreen() {
  ui.flash.classList.remove("is-active");
  void ui.flash.offsetWidth;
  ui.flash.classList.add("is-active");
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => ui.flash.classList.remove("is-active"), 900);
}

function showMoment() {
  ui.moment.classList.remove("is-visible");
  void ui.moment.offsetWidth;
  ui.moment.classList.add("is-visible");
  window.clearTimeout(momentTimer);
  momentTimer = window.setTimeout(() => ui.moment.classList.remove("is-visible"), 2200);
}

function popScore() {
  ui.scoreValue.classList.remove("is-popping");
  void ui.scoreValue.offsetWidth;
  ui.scoreValue.classList.add("is-popping");
}

function updateScoreUI() {
  ui.scoreValue.textContent = formatNumber(state.score);
  ui.bestValue.textContent = formatNumber(Math.max(state.best, state.score));
}

function updateBestUI() {
  ui.bestValue.textContent = formatNumber(Math.max(state.best, state.score));
  ui.menuBest.textContent = formatNumber(state.best);
}

function updateComboUI() {
  const visible = state.mode === "playing" && state.combo >= 2 && state.comboTimer > 0;
  ui.comboTag.classList.toggle("is-visible", visible);
  if (!visible) return;
  ui.comboValue.textContent = `×${Math.min(5, state.combo)}`;
  const ratio = clamp(state.comboTimer / GAME.comboWindow, 0, 1);
  ui.comboBar.style.transform = `scaleX(${ratio.toFixed(3)})`;
}

function updateNextPreview() {
  const spec = MOCHI_TYPES[state.nextLevel];
  drawMochiPreview(
    nextCtx,
    state.nextLevel,
    nextCanvas.width,
    nextCanvas.height,
    performance.now() / 1000,
  );
  ui.nextCard.setAttribute("aria-label", `下一颗：${spec.name}`);
}

function updateSoundUI() {
  for (const button of document.querySelectorAll(".js-sound")) {
    button.classList.toggle("is-muted", !audio.enabled);
    button.setAttribute("aria-pressed", String(audio.enabled));
    button.setAttribute("aria-label", audio.enabled ? "关闭声音" : "开启声音");
  }
}

function setOverlay(overlay, visible) {
  overlay.classList.toggle("is-hidden", !visible);
  overlay.setAttribute("aria-hidden", String(!visible));
}

function setHudInteractive(enabled) {
  ui.hud.toggleAttribute("inert", !enabled);
  ui.hud.setAttribute("aria-hidden", String(!enabled));
}

function updateDanger(dt) {
  let high = false;
  for (const body of mochiBodies) {
    const top = body.position.y - body.circleRadius;
    if (top < GAME.dangerY && body.speed < 1.6) {
      high = true;
      break;
    }
  }
  if (high) {
    state.dangerTimer += dt;
    if (state.dangerTimer >= GAME.dangerLimit) endGame();
  } else {
    state.dangerTimer = Math.max(0, state.dangerTimer - dt * 2.6);
  }
}

function updateSteam(dt) {
  state.steamTimer -= dt;
  if (state.steamTimer <= 0) {
    state.steamTimer = rand(1.1, 2.3);
    effects.steam(rand(B.left + 60, B.right - 60), B.rimY - rand(0, 28));
  }
}

function update(dt) {
  background.update(dt);
  effects.update(dt);
  state.shake = Math.max(0, state.shake - dt * 62);
  updateSteam(dt);

  if (state.mode !== "playing") return;

  state.dropCooldown = Math.max(0, state.dropCooldown - dt);
  state.hintTimer = Math.max(0, state.hintTimer - dt);
  if (state.hintTimer === 0) ui.hint.classList.remove("is-visible");

  if (held.left || held.right) {
    const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    state.aimX += direction * 340 * dt;
    clampAim();
  }

  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) {
      state.combo = 0;
      ui.comboTag.classList.remove("is-visible");
    } else {
      updateComboUI();
    }
  }

  state.accumulator += dt;
  let steps = 0;
  while (state.accumulator >= FIXED_STEP && steps < 5) {
    Engine.update(engine, FIXED_STEP * 1000);
    processMerges();
    state.accumulator -= FIXED_STEP;
    steps += 1;
  }
  if (steps === 5) state.accumulator = 0;

  updateDanger(dt);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
  lastFrame = now;
  if (state.paused) return;
  update(dt);
  stage.render(now, {
    mode: state.mode,
    aimX: state.aimX,
    currentLevel: state.currentLevel,
    dropCooldown: state.dropCooldown,
    dangerTimer: state.dangerTimer,
    shake: state.shake,
    bodies: mochiBodies,
    effects,
  });
}

function resize() {
  const shortLandscape = window.innerHeight < 560 && window.innerWidth > window.innerHeight;
  const hudBottom = ui.hud.offsetTop + ui.hud.offsetHeight;
  const topInset = Math.max(shortLandscape ? 72 : 100, hudBottom + 16);
  const bottomInset = shortLandscape ? 12 : 58;
  stage.resize(topInset, bottomInset);
  clampAim();
}

function isStartVisible() {
  return !ui.startOverlay.classList.contains("is-hidden");
}

function isOverVisible() {
  return !ui.overOverlay.classList.contains("is-hidden");
}

function handlePointerMove(event) {
  if (state.mode !== "playing") return;
  if (event.pointerType !== "mouse" && event.pointerId !== state.touchId) return;
  setAim(stage.screenToWorldX(event.clientX));
}

function handlePointerDown(event) {
  audio.init();
  if (state.mode !== "playing") return;
  if (event.pointerType === "mouse") {
    setAim(stage.screenToWorldX(event.clientX));
    dropCurrent();
    return;
  }
  state.touchId = event.pointerId;
  setAim(stage.screenToWorldX(event.clientX));
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is optional.
  }
}

function handlePointerUp(event) {
  if (event.pointerType === "mouse") return;
  if (state.touchId !== event.pointerId) return;
  setAim(stage.screenToWorldX(event.clientX));
  state.touchId = null;
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Nothing to release.
  }
  dropCurrent();
}

function handlePointerCancel(event) {
  if (state.touchId !== event.pointerId) return;
  state.touchId = null;
  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Nothing to release.
  }
}

function handleKeyDown(event) {
  if (event.repeat && (event.code === "Space" || event.key === "Enter")) return;
  const target = event.target;
  const onControl =
    target instanceof Element && Boolean(target.closest("button, a, input, select, textarea"));
  if (onControl && (event.code === "Space" || event.key === "Enter")) return;
  const key = event.key.toLowerCase();
  if (event.code === "ArrowLeft" || key === "a") {
    held.left = true;
    if (state.mode === "playing") event.preventDefault();
    return;
  }
  if (event.code === "ArrowRight" || key === "d") {
    held.right = true;
    if (state.mode === "playing") event.preventDefault();
    return;
  }
  if (event.code === "Space") {
    if (state.mode === "playing") {
      event.preventDefault();
      dropCurrent();
    } else if (
      (state.mode === "menu" && isStartVisible()) ||
      (state.mode === "over" && isOverVisible())
    ) {
      event.preventDefault();
      startGame();
    }
    return;
  }
  if (event.key === "Enter") {
    if (
      (state.mode === "menu" && isStartVisible()) ||
      (state.mode === "over" && isOverVisible())
    ) {
      event.preventDefault();
      startGame();
    }
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (event.code === "ArrowLeft" || key === "a") held.left = false;
  if (event.code === "ArrowRight" || key === "d") held.right = false;
}

function setupInput() {
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerCancel);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => {
    held.left = false;
    held.right = false;
  });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => window.setTimeout(resize, 160));

  document.addEventListener("visibilitychange", () => {
    state.paused = document.hidden;
    if (document.hidden) {
      held.left = false;
      held.right = false;
      state.touchId = null;
    }
    lastFrame = performance.now();
  });

  ui.startBtn.addEventListener("click", () => {
    audio.init();
    ui.startBtn.blur();
    startGame();
  });
  ui.replayBtn.addEventListener("click", () => {
    audio.init();
    ui.replayBtn.blur();
    startGame();
  });

  for (const button of document.querySelectorAll(".js-sound")) {
    button.addEventListener("click", () => {
      audio.toggle();
      updateSoundUI();
    });
  }
}

function installDebugTools() {
  if (!new URLSearchParams(window.location.search).has("debug")) return;
  window.__mochiDebug = {
    snapshot: () => ({
      mode: state.mode,
      score: state.score,
      best: state.best,
      combo: state.combo,
      maxCombo: state.maxCombo,
      highestLevel: state.highestLevel,
      currentLevel: state.currentLevel,
      nextLevel: state.nextLevel,
      aimX: Math.round(state.aimX),
      dropCooldown: Number(state.dropCooldown.toFixed(2)),
      dangerTimer: state.dangerTimer,
      bodies: mochiBodies.map((body) => ({
        level: body.mochiLevel,
        x: Math.round(body.position.x),
        y: Math.round(body.position.y),
        speed: Number(body.speed.toFixed(2)),
        removed: body.removed,
      })),
    }),
    start: startGame,
    drop: dropCurrent,
    spawn: (level, x, y) => {
      const safeLevel = clamp(Math.round(Number(level) || 0), 0, MAX_LEVEL);
      const safeX = clamp(Number(x) || 280, B.left + 8, B.right - 8);
      const safeY = clamp(Number(y) || 300, -100, B.bottomY - 8);
      const body = createMochi(safeLevel, safeX, safeY, { x: 0, y: 0 });
      return body.id;
    },
    spawnStatic: (level, x, y) => {
      const safeLevel = clamp(Math.round(Number(level) || 0), 0, MAX_LEVEL);
      const safeX = clamp(Number(x) || 280, B.left + 8, B.right - 8);
      const safeY = clamp(Number(y) || GAME.dangerY - 20, -100, B.bottomY - 8);
      const body = createMochi(safeLevel, safeX, safeY, { x: 0, y: 0 });
      Body.setStatic(body, true);
      return body.id;
    },
    setAim: (x) => setAim(Number(x) || state.aimX),
    end: endGame,
    clearBodies,
  };
}

function init() {
  resize();
  setHudInteractive(false);
  updateBestUI();
  updateSoundUI();
  state.currentLevel = rollDropLevel();
  state.nextLevel = rollDropLevel();
  clampAim();
  updateNextPreview();
  setupInput();
  installDebugTools();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

init();
