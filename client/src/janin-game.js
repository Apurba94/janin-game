// Orbit Relay canvas game: low-cost 2D simulation, local bot fallback, prediction-friendly player movement, and concise arena rendering.

const COLORS = ["#D9FF48", "#FF6B6B", "#8CE7FF", "#B596FF", "#FFD166", "#42E8C8", "#FF9AE5", "#A7BEFF"];
const WORLD = 1000;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (min, max) => min + Math.random() * (max - min);

function makeOrb(id) { return { id, x: random(130, 870), y: random(150, 850), hue: Math.floor(Math.random() * 3), pulse: Math.random() * 2 }; }
function makePlayer(id, name, color, x, y, bot = false) { return { id, name, color, x, y, vx: 0, vy: 0, score: 0, bot, dashUntil: 0, cooldown: 0, trail: [], heading: 0 }; }

export class JaninArena {
  constructor(canvas, images, onState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.images = images;
    this.onState = onState;
    this.size = { width: 390, height: 800, ratio: 1 };
    this.localId = "local";
    this.mode = "practice";
    this.room = "PRACTICE";
    this.local = makePlayer(this.localId, "YOU", 0, 270, 670);
    this.players = [this.local, makePlayer("bot-coral", "CORAL", 1, 720, 250, true), makePlayer("bot-blue", "BLUE", 2, 670, 720, true), makePlayer("bot-violet", "VIOLET", 3, 350, 300, true)];
    this.orbs = Array.from({ length: 8 }, (_, index) => makeOrb(`orb-${index}`));
    this.input = { x: 0, y: 0, dash: false };
    this.keys = new Set();
    this.remaining = 90;
    this.running = true;
    this.last = performance.now();
    this.elapsed = 0;
    this.pulses = [];
    this.demo = new URLSearchParams(location.search).has("demo");
    this.resize();
    this.emit();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    this.size = { width: rect.width, height: rect.height, ratio };
  }

  beginPractice(name = "YOU") {
    this.mode = "practice";
    this.room = "PRACTICE";
    this.local = makePlayer(this.localId, name.toUpperCase().slice(0, 12) || "YOU", 0, 270, 670);
    this.players = [this.local, makePlayer("bot-coral", "CORAL", 1, 720, 250, true), makePlayer("bot-blue", "BLUE", 2, 670, 720, true), makePlayer("bot-violet", "VIOLET", 3, 350, 300, true)];
    this.orbs = Array.from({ length: 8 }, (_, index) => makeOrb(`orb-${index}`));
    this.remaining = 90;
    this.running = true;
    this.emit();
  }

  joinOnline(welcome) {
    this.mode = "online";
    this.room = welcome.r || "JANIN";
    this.localId = welcome.id;
    this.local = makePlayer(welcome.id, welcome.n || "YOU", welcome.c || 0, 500, 500);
    this.players = [this.local];
    this.orbs = [];
    this.remaining = 90;
    this.running = true;
    this.emit();
  }

  applySnapshot(snapshot) {
    if (this.mode !== "online") return;
    const before = new Map(this.players.map((player) => [player.id, player]));
    this.players = (snapshot.p || []).map((data) => {
      const player = before.get(data.i) || makePlayer(data.i, data.n, data.c, data.x, data.y);
      player.name = data.n; player.color = data.c; player.x = data.x; player.y = data.y; player.score = data.s; player.heading = data.h || 0;
      return player;
    });
    this.local = this.players.find((player) => player.id === this.localId) || this.local;
    this.orbs = (snapshot.o || []).map((orb) => ({ id: orb.i, x: orb.x, y: orb.y, hue: orb.h || 0, pulse: this.elapsed }));
    this.remaining = snapshot.s ?? this.remaining;   // server: t = message type, s = seconds left
    this.emit();
  }

  setInput(input) { this.input = { ...input }; }
  dash() { this.input.dash = true; }

  tick(now) {
    const delta = clamp((now - this.last) / 1000, 0, 0.033);
    this.last = now;
    this.elapsed += delta;
    if (this.running && this.mode === "practice") this.updatePractice(delta);
    this.draw();
    requestAnimationFrame((time) => this.tick(time));
  }

  updatePractice(delta) {
    this.remaining = Math.max(0, this.remaining - delta);
    if (this.remaining === 0) { this.running = false; this.emit(); return; }
    if (this.demo) this.applyDemoInput();
    this.advancePlayer(this.local, this.input, delta);
    for (const bot of this.players.filter((player) => player.bot)) this.advanceBot(bot, delta);
    this.collectOrbs();
    for (const pulse of this.pulses) pulse.life -= delta;
    this.pulses = this.pulses.filter((pulse) => pulse.life > 0);
    if (Math.floor(this.elapsed * 8) % 2 === 0) this.emit(false);
  }

  applyDemoInput() {
    const target = this.orbs.slice().sort((a, b) => distance(this.local, a) - distance(this.local, b))[0];
    if (!target) return;
    const dx = target.x - this.local.x; const dy = target.y - this.local.y; const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.input.x = dx / magnitude; this.input.y = dy / magnitude;
    if (magnitude > 160 && this.local.cooldown <= 0) this.input.dash = true;
  }

  advanceBot(bot, delta) {
    const target = this.orbs.slice().sort((a, b) => distance(bot, a) - distance(bot, b))[0];
    if (!target) return;
    const dx = target.x - bot.x; const dy = target.y - bot.y; const magnitude = Math.max(1, Math.hypot(dx, dy));
    this.advancePlayer(bot, { x: dx / magnitude, y: dy / magnitude, dash: magnitude > 240 && bot.cooldown <= 0 && Math.random() > 0.97 }, delta);
  }

  advancePlayer(player, input, delta) {
    const now = this.elapsed;
    player.cooldown = Math.max(0, player.cooldown - delta);
    if (input.dash && player.cooldown <= 0) { player.dashUntil = now + 0.22; player.cooldown = 1.25; this.pulses.push({ x: player.x, y: player.y, color: COLORS[player.color], life: 0.3, max: 0.3 }); }
    const magnitude = Math.max(1, Math.hypot(input.x, input.y));
    const speed = now < player.dashUntil ? 565 : 255;
    player.vx = (input.x / magnitude) * speed; player.vy = (input.y / magnitude) * speed;
    player.x = clamp(player.x + player.vx * delta, 58, WORLD - 58); player.y = clamp(player.y + player.vy * delta, 80, WORLD - 58);
    if (Math.abs(player.vx) + Math.abs(player.vy) > 1) player.heading = Math.atan2(player.vy, player.vx);
    player.trail.push({ x: player.x, y: player.y, life: 0.42 });
    player.trail.forEach((point) => { point.life -= delta; }); player.trail = player.trail.filter((point) => point.life > 0).slice(-10);
    if (!player.bot) input.dash = false;
  }

  collectOrbs() {
    for (const orb of this.orbs) {
      const claimer = this.players.find((player) => distance(player, orb) < 42);
      if (!claimer) continue;
      claimer.score += 1;
      this.pulses.push({ x: orb.x, y: orb.y, color: COLORS[claimer.color], life: 0.5, max: 0.5 });
      orb.x = random(120, 880); orb.y = random(130, 860); orb.hue = Math.floor(Math.random() * 3); orb.pulse = this.elapsed;
    }
  }

  emit(force = true) {
    if (!force && Math.floor(this.elapsed * 8) % 2 !== 0) return;
    const leader = this.players.slice().sort((a, b) => b.score - a.score)[0] || this.local;
    this.onState({ mode: this.mode, room: this.room, remaining: Math.ceil(this.remaining), score: this.local.score, leader: leader.name, players: this.players.length, dashReady: this.local.cooldown <= 0, done: !this.running });
  }

  map(point) { const scale = Math.min(this.size.width, this.size.height) / WORLD; return { x: (this.size.width - WORLD * scale) / 2 + point.x * scale, y: (this.size.height - WORLD * scale) / 2 + point.y * scale, scale }; }

  draw() {
    const { ctx } = this; const { width, height, ratio } = this.size;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.46, 10, width * 0.5, height * 0.46, Math.max(width, height) * 0.82);
    gradient.addColorStop(0, "#18264d"); gradient.addColorStop(0.56, "#10172f"); gradient.addColorStop(1, "#090d1e"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    const bg = this.images.arena;
    if (bg?.complete && bg.naturalWidth) { const ratioImage = Math.max(width / bg.naturalWidth, height / bg.naturalHeight); ctx.globalAlpha = 0.2; ctx.drawImage(bg, (width - bg.naturalWidth * ratioImage) / 2, (height - bg.naturalHeight * ratioImage) / 2, bg.naturalWidth * ratioImage, bg.naturalHeight * ratioImage); ctx.globalAlpha = 1; }
    this.drawArena(ctx); this.drawPulses(ctx); this.drawOrbs(ctx); this.drawPlayers(ctx); this.drawRoundEnd(ctx);
  }

  drawArena(ctx) {
    const center = this.map({ x: 500, y: 500 }); const radius = center.scale * 440;
    ctx.strokeStyle = "rgba(140,231,255,.17)"; ctx.lineWidth = 1;
    for (let ring = 0; ring < 4; ring += 1) { ctx.beginPath(); ctx.arc(center.x, center.y, radius * (1 - ring * 0.18), 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([4, 13]); ctx.strokeStyle = "rgba(217,255,72,.2)"; ctx.beginPath(); ctx.arc(center.x, center.y, radius * 0.6, this.elapsed * 0.09, Math.PI * 2 + this.elapsed * 0.09); ctx.stroke(); ctx.setLineDash([]);
    for (let index = 0; index < 80; index += 1) { const x = (index * 97) % this.size.width; const y = (index * 181) % this.size.height; ctx.fillStyle = index % 3 ? "rgba(140,231,255,.24)" : "rgba(217,255,72,.28)"; ctx.fillRect(x, y, 1, 1); }
  }

  drawOrbs(ctx) {
    for (const orb of this.orbs) { const point = this.map(orb); const radius = 12 * point.scale; const phase = this.elapsed * 3 + orb.pulse; const color = ["#8CE7FF", "#D9FF48", "#FF6B6B"][orb.hue]; ctx.strokeStyle = `${color}88`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(point.x, point.y, radius * (1.7 + Math.sin(phase) * 0.15), 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = "#f6fbff"; ctx.beginPath(); ctx.arc(point.x - radius * 0.26, point.y - radius * 0.26, radius * 0.28, 0, Math.PI * 2); ctx.fill(); }
  }

  drawPlayers(ctx) {
    for (const player of this.players) {
      const point = this.map(player); const scale = point.scale;
      for (const trail of player.trail) { const trailPoint = this.map(trail); ctx.globalAlpha = trail.life * 1.3; ctx.fillStyle = COLORS[player.color]; ctx.beginPath(); ctx.arc(trailPoint.x, trailPoint.y, 6 * scale * trail.life * 2, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(player.heading); ctx.fillStyle = COLORS[player.color]; ctx.strokeStyle = "#070b18"; ctx.lineWidth = 3; ctx.shadowColor = COLORS[player.color]; ctx.shadowBlur = 15; ctx.beginPath(); ctx.moveTo(22 * scale, 0); ctx.lineTo(-14 * scale, -14 * scale); ctx.lineTo(-8 * scale, 0); ctx.lineTo(-14 * scale, 14 * scale); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = "#f7fbff"; ctx.beginPath(); ctx.arc(-1 * scale, 0, 5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgba(247,251,255,.85)"; ctx.font = `700 ${Math.max(8, 11 * scale)}px 'IBM Plex Mono', monospace`; ctx.textAlign = "center"; ctx.fillText(player.name, point.x, point.y - 30 * scale);
    }
  }

  drawPulses(ctx) { for (const pulse of this.pulses) { const point = this.map(pulse); ctx.globalAlpha = pulse.life / pulse.max; ctx.strokeStyle = pulse.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(point.x, point.y, (1 - pulse.life / pulse.max) * 70 * point.scale, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }

  drawRoundEnd(ctx) { if (this.running) return; ctx.fillStyle = "rgba(6,9,24,.72)"; ctx.fillRect(0, 0, this.size.width, this.size.height); ctx.fillStyle = "#D9FF48"; ctx.font = "700 26px 'Space Grotesk', sans-serif"; ctx.textAlign = "center"; ctx.fillText("RELAY COMPLETE", this.size.width / 2, this.size.height / 2 - 8); ctx.fillStyle = "#f7fbff"; ctx.font = "500 13px 'IBM Plex Mono', monospace"; ctx.fillText("TAP PRACTICE TO RESET", this.size.width / 2, this.size.height / 2 + 23); }
}
