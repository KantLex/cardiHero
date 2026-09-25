// Screens, input, animation and the glue between the engine and the canvas.
(function (root) {
  const { W, H } = R;
  const K = '#1a1c2c';

  const L = {
    hero: [{ x: 320, y: 258 }, { x: 320, y: 36 }],
    power: [{ x: 374, y: 262 }, { x: 374, y: 34 }],
    weapon: [{ x: 266, y: 262 }, { x: 266, y: 34 }],
    row: [188, 108],
    deck: [{ x: 600, y: 204 }, { x: 600, y: 86 }],
    spacing: 52,
    handY: 336,
    dropY: 290,
    endTurn: { x: 564, y: 136, w: 68, h: 22 },
  };

  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t * t * (3 - 2 * t);

  const UI = {
    canvas: null, ctx: null,
    screen: 'title',
    speed: 1,
    difficulty: 'normal',
    mouse: { x: -100, y: -100, down: false, downX: 0, downY: 0 },
    hits: [],
    views: new Map(),
    lastPos: new Map(),
    effects: [],
    particles: [],
    shake: 0,
    game: null, ai: null,
    busy: false,
    mode: null,
    toastMsg: null,
    banner: null,
    showCard: null,
    overAt: 0,
    menuOpen: false,
    helpOpen: false,
    mull: null,
    playerCls: 'mage',
    hoverSel: -1,
    titleT: 0,
    aiArrow: null,
    sleep(ms) { return new Promise((r) => setTimeout(r, ms / UI.speed)); },
  };

  // ============================================================== views
  function view(uid, x, y) {
    let v = UI.views.get(uid);
    if (!v) {
      v = { x, y, tx: x, ty: y, flash: 0, scale: 1, alpha: 1, dying: 0, lunge: null };
      UI.views.set(uid, v);
    }
    return v;
  }
  function posOf(e) {
    if (!e) return { x: 320, y: 180 };
    if (e.kind === 'hero') return L.hero[e.owner];
    const v = UI.views.get(e.uid);
    if (v) return { x: v.x, y: v.y };
    return UI.lastPos.get(e.uid) || { x: 320, y: 180 };
  }

  function boardSlots(p, gapIndex) {
    const n = p.board.length;
    const hasGap = gapIndex != null;
    const total = n + (hasGap ? 1 : 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      const slot = i + (hasGap && i >= gapIndex ? 1 : 0);
      out.push({ x: 320 + (slot - (total - 1) / 2) * L.spacing, y: L.row[p.idx] });
    }
    const gapPos = hasGap ? { x: 320 + (gapIndex - (total - 1) / 2) * L.spacing, y: L.row[p.idx] } : null;
    return { slots: out, gapPos };
  }

  function handSlots(n, hoverIdx) {
    const out = [];
    const spacing = n <= 1 ? 0 : Math.min(46, 300 / (n - 1));
    for (let i = 0; i < n; i++) {
      const off = i - (n - 1) / 2;
      let x = 320 + off * spacing;
      if (hoverIdx >= 0 && i !== hoverIdx) x += i < hoverIdx ? -10 : 10;
      out.push({ x, y: L.handY + Math.min(10, off * off * 0.7) });
    }
    return out;
  }

  function enemyHandSlots(n) {
    const out = [];
    const spacing = n <= 1 ? 0 : Math.min(16, 150 / (n - 1));
    for (let i = 0; i < n; i++) out.push({ x: 196 + (i - (n - 1) / 2) * spacing, y: 6 });
    return out;
  }

  function insertIndex(p, mx) {
    const { slots } = boardSlots(p, null);
    let i = 0;
    for (const s of slots) if (s.x < mx) i++;
    return i;
  }

  // ============================================================== effects
  function particle(x, y, o = {}) {
    UI.particles.push({
      x, y, vx: o.vx ?? (Math.random() - 0.5) * 120, vy: o.vy ?? (Math.random() - 0.8) * 120,
      g: o.g ?? 240, life: o.life ?? 0.6, t: 0, col: o.col || '#ffcd75', size: o.size || 2,
    });
  }
  function burst(x, y, cols, n = 14, o = {}) {
    for (let i = 0; i < n; i++) particle(x + (Math.random() - 0.5) * (o.spread || 12), y + (Math.random() - 0.5) * (o.spread || 12), {
      col: cols[i % cols.length], size: Math.random() < 0.3 ? 3 : 2, life: 0.4 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * (o.power || 160), vy: (Math.random() - 0.7) * (o.power || 160), g: o.g ?? 260,
    });
  }
  function floatText(x, y, str, col, o = {}) {
    UI.effects.push({ type: 'float', x, y, str, col, t0: now(), dur: (o.dur || 900), scale: o.scale || 2 });
  }
  function toast(msg) { UI.toastMsg = { msg, t0: now() }; }

  const PROJ = {
    fire: ['#ef7d57', '#ffcd75', 4, 'fire'],
    bigfire: ['#b13e53', '#ffcd75', 7, 'fire'],
    frost: ['#41a6f6', '#f4f4f4', 4, 'freeze'],
    arcane: ['#b55ac8', '#f4f4f4', 3, 'zap'],
    holy: ['#e6a33c', '#f4f4f4', 4, 'zap'],
    shield: ['#566c86', '#94b0c2', 4, 'hit'],
    claw: ['#b13e53', '#ff8fb0', 4, 'attack'],
    dagger: ['#94b0c2', '#f4f4f4', 3, 'zap'],
    bomb: ['#1a1c2c', '#ef7d57', 4, 'fire'],
    arrow: ['#8b5a3c', '#f4f4f4', 3, 'zap'],
  };

  let lastHitSound = 0;
  function hitSound(name) {
    const t = now();
    if (t - lastHitSound < 60) return;
    lastHitSound = t;
    Sound.play(name);
  }

  const fx = {
    wait: (ms) => UI.sleep(ms),
    async cardPlayed(p, c, target) {
      Sound.play('play');
      if (p.idx === 1) {
        UI.showCard = { defId: c.defId, t0: now(), dur: 1300 / UI.speed };
        await UI.sleep(1100);
      } else if (UI.game.def(c).type !== 'minion') {
        const v = UI.views.get(c.uid);
        if (v) burst(v.x, v.y, ['#ffcd75', '#f4f4f4', '#73eff7'], 16);
        await UI.sleep(120);
      }
    },
    async summon(m) {
      const p = UI.game.P(m.owner);
      const i = p.board.indexOf(m);
      const { slots } = boardSlots(p, null);
      const s = slots[i] || { x: 320, y: L.row[m.owner] };
      const existing = UI.views.get(m.uid);
      const v = view(m.uid, s.x, s.y);
      if (!existing) v.scale = 0.2;
      v.flash = 0.8;
      Sound.play('summon');
      burst(s.x, s.y + 24, ['#94b0c2', '#566c86', '#f4f4f4'], 10, { power: 90, g: 120 });
      await UI.sleep(260);
    },
    async attack(a, t) {
      const v = a.kind === 'hero' ? heroView(a.owner) : view(a.uid, posOf(a).x, posOf(a).y);
      const tp = posOf(t);
      v.lunge = { tx: tp.x, ty: tp.y, t0: now(), dur: 380 / UI.speed };
      Sound.play('attack');
      await UI.sleep(190);
      UI.shake = Math.max(UI.shake, 3);
    },
    async damage(e, n, opts = {}) {
      const p = posOf(e);
      const v = e.kind === 'hero' ? heroView(e.owner) : UI.views.get(e.uid);
      if (v) v.flash = 1;
      floatText(p.x, p.y - 6, '-' + n, '#ff8fb0', { scale: 2 });
      burst(p.x, p.y, ['#b13e53', '#ef7d57', '#f4f4f4'], 10);
      UI.shake = Math.max(UI.shake, e.kind === 'hero' ? 4 : 2);
      hitSound('hit');
      if (!opts.quiet) await UI.sleep(230);
    },
    async heal(e, n) {
      const p = posOf(e);
      floatText(p.x, p.y - 6, '+' + n, '#a7f070');
      for (let i = 0; i < 10; i++) particle(p.x + (Math.random() - 0.5) * 30, p.y + 10, { col: i % 2 ? '#a7f070' : '#f4f4f4', vx: 0, vy: -40 - Math.random() * 40, g: 0, life: 0.8 });
      hitSound('heal');
      await UI.sleep(220);
    },
    async shieldPop(e) {
      const p = posOf(e);
      burst(p.x, p.y, ['#ffcd75', '#f4f4f4'], 18, { spread: 40, power: 200 });
      floatText(p.x, p.y - 10, 'BLOCKED', '#ffcd75', { scale: 1 });
      hitSound('shield');
      await UI.sleep(220);
    },
    async freeze(e) {
      const p = posOf(e);
      burst(p.x, p.y, ['#73eff7', '#f4f4f4', '#41a6f6'], 14, { spread: 30, power: 80, g: 30 });
      hitSound('freeze');
      await UI.sleep(160);
    },
    async buff(e) {
      const p = posOf(e);
      const v = e.kind === 'hero' ? heroView(e.owner) : UI.views.get(e.uid);
      if (v) v.flash = 0.6;
      for (let i = 0; i < 12; i++) particle(p.x + (Math.random() - 0.5) * 36, p.y + 20, { col: i % 2 ? '#ffcd75' : '#f4f4f4', vx: 0, vy: -50 - Math.random() * 50, g: 0, life: 0.7 });
      hitSound('buff');
      await UI.sleep(200);
    },
    async silence(e) {
      const p = posOf(e);
      floatText(p.x, p.y - 10, 'SILENCED', '#b55ac8', { scale: 1 });
      burst(p.x, p.y, ['#b55ac8', '#5d275d'], 12);
      Sound.play('zap');
      await UI.sleep(300);
    },
    async transform(m) {
      const p = posOf(m);
      const v = view(m.uid, p.x, p.y);
      v.scale = 0.3; v.flash = 1;
      burst(p.x, p.y, ['#f4f4f4', '#94b0c2', '#b55ac8'], 20, { spread: 30 });
      Sound.play('zap');
      await UI.sleep(320);
    },
    async deaths(list) {
      const t = now();
      for (const m of list) {
        const v = UI.views.get(m.uid);
        if (v) v.dying = t;
      }
      Sound.play('death');
      await UI.sleep(380);
      for (const m of list) {
        const p = posOf(m);
        UI.lastPos.set(m.uid, p);
        const d = CARDS[m.defId];
        const rows = Sprites.resolve(d.sprite).rows;
        const cols = new Set();
        for (const r of rows) for (const ch of r) if (ch !== '.' && ch !== 'k') cols.add(Sprites.PAL[ch]);
        burst(p.x, p.y, [...cols].slice(0, 5).concat(['#1a1c2c']), 26, { spread: 28, power: 180 });
      }
      await UI.sleep(60);
    },
    async projectile(from, to, kind = 'fire', mul = 1) {
      const a = posOf(from), b = posOf(to);
      const spec = PROJ[kind] || PROJ.fire;
      Sound.play(spec[3]);
      const dur = 380 * mul / UI.speed;
      await new Promise((resolve) => UI.effects.push({ type: 'proj', x0: a.x, y0: a.y, x1: b.x, y1: b.y, t0: now(), dur, spec, kind, resolve }));
      burst(b.x, b.y, [spec[0], spec[1]], kind === 'bigfire' ? 40 : 16, { spread: kind === 'bigfire' ? 30 : 10 });
      UI.shake = Math.max(UI.shake, kind === 'bigfire' ? 8 : 2);
    },
    async aoe(kind, p, target) {
      const cols = { fire: '#ef7d57', frost: '#73eff7', holy: '#ffcd75', wind: '#f4f4f4', slash: '#b13e53' };
      if (kind === 'slash' && target) {
        const tp = posOf(target);
        UI.effects.push({ type: 'slash', x: tp.x, y: tp.y, t0: now(), dur: 300 });
        Sound.play('attack');
        await UI.sleep(200);
        return;
      }
      UI.effects.push({ type: 'flash', col: cols[kind] || '#f4f4f4', t0: now(), dur: 350 });
      UI.shake = Math.max(UI.shake, 5);
      Sound.play(kind === 'frost' ? 'freeze' : kind === 'holy' ? 'buff' : 'fire');
      const enemyRow = p ? L.row[1 - p.idx] : 148;
      for (let i = 0; i < 40; i++) {
        const x = 100 + Math.random() * 440;
        if (kind === 'fire') particle(x, enemyRow - 40 - Math.random() * 30, { col: i % 2 ? '#ef7d57' : '#ffcd75', vx: 0, vy: 120 + Math.random() * 80, g: 100, life: 0.6 });
        else if (kind === 'frost') particle(x, enemyRow + (Math.random() - 0.5) * 50, { col: i % 2 ? '#73eff7' : '#f4f4f4', vx: (Math.random() - 0.5) * 40, vy: -20, g: 0, life: 0.7 });
        else if (kind === 'holy') particle(x, enemyRow + 30, { col: i % 2 ? '#ffcd75' : '#f4f4f4', vx: 0, vy: -90 - Math.random() * 60, g: 0, life: 0.7 });
        else particle(x, 100 + Math.random() * 160, { col: '#f4f4f4', vx: 260, vy: (Math.random() - 0.5) * 30, g: 0, life: 0.5 });
      }
      await UI.sleep(320);
    },
    async draw(p, c) {
      const d = L.deck[p.idx];
      view(c.uid, d.x, d.y);
      if (p.idx === 0) Sound.play('draw');
      await UI.sleep(p.idx === 0 ? 180 : 100);
    },
    async burn(p, defId) {
      UI.effects.push({ type: 'burn', defId, owner: p.idx, t0: now(), dur: 900 });
      Sound.play('burn');
      await UI.sleep(800);
    },
    async fatigue(p, n) {
      const hp = L.hero[p.idx];
      floatText(hp.x, hp.y - 30, 'FATIGUE!', '#b55ac8', { scale: 2, dur: 1200 });
      await UI.sleep(500);
    },
    async armor(p, n) {
      const hp = L.hero[p.idx];
      floatText(hp.x, hp.y - 8, '+' + n + ' ARMOR', '#94b0c2', { scale: 1 });
      burst(hp.x + 24, hp.y + 8, ['#94b0c2', '#f4f4f4'], 10);
      Sound.play('armor');
      await UI.sleep(250);
    },
    async equip(p) {
      const w = L.weapon[p.idx];
      burst(w.x, w.y, ['#94b0c2', '#f4f4f4', '#ffcd75'], 16);
      Sound.play('armor');
      await UI.sleep(250);
    },
    async weaponBreak(p) {
      const w = L.weapon[p.idx];
      burst(w.x, w.y, ['#566c86', '#94b0c2', '#1a1c2c'], 18);
      hitSound('hit');
      await UI.sleep(200);
    },
    async turnStart(p) {
      if (p.idx === 0) {
        UI.banner = { text: 'YOUR TURN', t0: now(), dur: 1100 / UI.speed, col: '#ffcd75' };
        Sound.play('turn');
        await UI.sleep(700);
      } else {
        UI.banner = { text: 'ENEMY TURN', t0: now(), dur: 800 / UI.speed, col: '#ff8fb0', small: true };
        Sound.play('enemyTurn');
        await UI.sleep(450);
      }
    },
    async heroPower(p) {
      const pw = L.power[p.idx];
      burst(pw.x, pw.y, ['#ffcd75', '#f4f4f4'], 12);
      Sound.play('click');
      if (p.idx === 1) { UI.showCard = { power: p.cls, t0: now(), dur: 1000 / UI.speed }; await UI.sleep(700); }
      await UI.sleep(150);
    },
    gameOver(winner) {
      UI.overAt = now();
      UI.mode = null;
      const loser = winner === 0 ? 1 : winner === 1 ? 0 : -1;
      const boom = (idx) => {
        const hp = L.hero[idx];
        for (let k = 0; k < 3; k++) setTimeout(() => { burst(hp.x, hp.y, ['#ef7d57', '#ffcd75', '#b13e53', '#1a1c2c'], 40, { spread: 40, power: 260 }); UI.shake = 10; }, k * 250);
      };
      if (loser >= 0) boom(loser); else { boom(0); boom(1); }
      setTimeout(() => Sound.play(winner === 0 ? 'win' : 'lose'), 700);
    },
  };

  const heroViews = [{ flash: 0, lunge: null }, { flash: 0, lunge: null }];
  function heroView(i) { return heroViews[i]; }

  // ============================================================== game flow
  function startMatch(cls) {
    UI.playerCls = cls;
    const others = Object.keys(HEROES).filter((c) => c !== cls);
    const enemyCls = others[Math.floor(Math.random() * others.length)];
    const first = Math.random() < 0.5 ? 0 : 1;
    const g = Game.create({ classes: [cls, enemyCls], seed: (Math.random() * 1e9) | 0, first, ai: [false, true] });
    g.fx = fx;
    UI.game = g;
    UI.ai = new AI(UI.difficulty);
    UI.views.clear(); UI.lastPos.clear(); UI.effects = []; UI.particles = [];
    UI.mode = null; UI.busy = false; UI.overAt = 0; UI.showCard = null; UI.banner = null; UI.menuOpen = false;
    heroViews[0] = { flash: 0, lunge: null }; heroViews[1] = { flash: 0, lunge: null };
    g.mulligan(g.P(1), UI.ai.chooseMulligan(g, g.P(1)));
    UI.mull = { selected: new Set(), first };
    UI.screen = 'mulligan';
  }

  async function confirmMulligan() {
    const g = UI.game;
    await g.mulligan(g.P(0), [...UI.mull.selected]);
    UI.screen = 'game';
    // Place opening hand views.
    const slots = handSlots(g.P(0).hand.length, -1);
    g.P(0).hand.forEach((c, i) => view(c.uid, slots[i].x, slots[i].y - 120));
    const es = enemyHandSlots(g.P(1).hand.length);
    g.P(1).hand.forEach((c, i) => view(c.uid, es[i].x, es[i].y));
    UI.busy = true;
    await UI.sleep(300);
    await g.begin();
    UI.busy = false;
    if (g.s.current === 1) runAI();
  }

  async function act(fn) {
    if (UI.busy || !UI.game || UI.game.s.over) return;
    UI.busy = true;
    UI.mode = null;
    try { await fn(); } catch (e) { console.error(e); }
    UI.busy = false;
    const g = UI.game;
    if (!g.s.over && g.s.current === 1) runAI();
  }

  async function runAI() {
    const g = UI.game;
    if (UI.aiRunning) return;
    UI.aiRunning = true;
    UI.busy = true;
    try {
      await UI.sleep(500);
      for (let k = 0; k < 40 && !g.s.over && g.s.current === 1 && UI.game === g; k++) {
        const a = await UI.ai.bestAction(g, 1);
        if (!a) break;
        if (a.type === 'attack') {
          UI.aiArrow = { from: a.src, to: a.target, t0: now() };
          await UI.sleep(550);
          UI.aiArrow = null;
        }
        const ok = await g.apply(g.P(1), a);
        if (!ok) break;
        await UI.sleep(350);
      }
      if (!g.s.over && UI.game === g) { await UI.sleep(300); await g.endTurn(); }
    } catch (e) { console.error(e); }
    UI.aiRunning = false;
    if (UI.game === g) UI.busy = false;
  }

  function myTurn() {
    const g = UI.game;
    return g && !g.s.over && g.s.current === 0 && g.s.phase === 'play' && !UI.busy;
  }

  // ============================================================== hit testing
  function hoverTarget() {
    const g = UI.game;
    const { x, y } = UI.mouse;
    if (!g) return null;
    const me = g.P(0), op = g.P(1);
    // hand (topmost first)
    if (!UI.mode || UI.mode.type !== 'drag') {
      const hs = handSlots(me.hand.length, -1);
      for (let i = me.hand.length - 1; i >= 0; i--) {
        const s = hs[i];
        if (x >= s.x - 26 && x <= s.x + 26 && y >= s.y - 36 && y <= H) return { type: 'hand', card: me.hand[i], idx: i };
      }
    }
    for (const p of [me, op]) {
      for (const m of p.board) {
        const v = UI.views.get(m.uid);
        if (!v || v.dying) continue;
        if (Math.abs(x - v.x) <= 22 && Math.abs(y - v.y) <= 27) return { type: 'minion', ent: m };
      }
      const hp = L.hero[p.idx];
      if (Math.abs(x - hp.x) <= 27 && Math.abs(y - hp.y) <= 27) return { type: 'hero', ent: p.hero, p };
      const pw = L.power[p.idx];
      if (Math.hypot(x - pw.x, y - pw.y) <= 14) return { type: 'power', p };
      const wp = L.weapon[p.idx];
      if (p.weapon && Math.hypot(x - wp.x, y - wp.y) <= 14) return { type: 'weapon', p };
    }
    // history
    const hist = g.s.history.slice(-8).reverse();
    for (let i = 0; i < hist.length; i++) {
      const hx = 8, hy = 70 + i * 24;
      if (x >= hx && x <= hx + 22 && y >= hy && y <= hy + 22) return { type: 'history', entry: hist[i] };
    }
    return null;
  }

  // ============================================================== input
  function toCanvas(e) {
    const r = UI.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function onDown(e) {
    Sound.unlock();
    const p = toCanvas(e);
    UI.mouse.x = p.x; UI.mouse.y = p.y;
    if (e.button === 2) { cancelMode(); return; }
    UI.mouse.down = true; UI.mouse.downX = p.x; UI.mouse.downY = p.y;
    UI.inspect = null;
    // immediate-mode buttons first (topmost last registered)
    for (let i = UI.hits.length - 1; i >= 0; i--) {
      const h = UI.hits[i];
      if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
        if (!h.disabled) { if (!h.silent) Sound.play('click'); h.fn(); }
        return;
      }
    }
    if (UI.screen !== 'game' || UI.menuOpen || UI.helpOpen) return;
    const g = UI.game;
    if (g.s.over) return;
    const ht = hoverTarget();

    if (UI.mode && UI.mode.type === 'aim' && UI.mode.sticky) {
      if (ht && ht.ent && UI.mode.valid.has(ht.ent.uid)) executeAim(ht.ent);
      else cancelMode();
      return;
    }
    if (!myTurn()) { if (ht && ht.type === 'hand') toast('WAIT FOR YOUR TURN'); return; }
    const me = g.P(0);
    if (!ht) return;
    if (ht.type === 'hand') {
      const c = ht.card;
      if (!g.canPlay(me, c)) {
        Sound.play('error');
        const d = g.def(c);
        if (g.cardCost(me, c) > me.mana) toast('NOT ENOUGH MANA');
        else if (d.type === 'minion') toast('YOUR BOARD IS FULL');
        else toast("CAN'T PLAY THAT NOW");
        return;
      }
      UI.mode = { type: 'drag', uid: c.uid };
      return;
    }
    if ((ht.type === 'minion' || ht.type === 'hero') && ht.ent.owner === 0) {
      const ent = ht.ent;
      if (g.canAttack(ent)) {
        const from = posOf(ent);
        UI.mode = { type: 'aim', src: 'attack', uid: ent.uid, from, valid: new Set(g.attackTargets(ent).map((t) => t.uid)), sticky: false };
      } else {
        Sound.play('error');
        if (ent.frozen) toast('FROZEN!');
        else if (ent.kind === 'minion' && ent.sick && ent.attacks === 0) toast('NEEDS A TURN TO GET READY');
        else if (g.atkOf(ent) <= 0) toast(ent.kind === 'hero' ? 'NO WEAPON' : 'NO ATTACK');
        else toast('ALREADY ATTACKED');
      }
      return;
    }
    if (ht.type === 'power' && ht.p.idx === 0) {
      const pw = HEROES[me.cls].power;
      if (!g.canUsePower(me)) {
        Sound.play('error');
        toast(me.powerUsed ? 'ALREADY USED' : me.mana < pw.cost ? 'NOT ENOUGH MANA' : "CAN'T USE THAT NOW");
        return;
      }
      if (pw.target) {
        UI.mode = { type: 'aim', src: 'power', from: { x: L.power[0].x, y: L.power[0].y }, valid: new Set(g.validTargets(pw.target, me).map((t) => t.uid)), sticky: false };
      } else act(() => g.usePower(me));
    }
  }

  function onMove(e) {
    const p = toCanvas(e);
    UI.mouse.x = p.x; UI.mouse.y = p.y;
    const g = UI.game;
    if (UI.mode && UI.mode.type === 'drag' && g) {
      const me = g.P(0);
      const c = g.handCard(me, UI.mode.uid);
      if (!c) { UI.mode = null; return; }
      const d = g.def(c);
      if (d.type === 'spell' && g.needsTarget(me, c) && p.y < L.dropY) {
        const hs = handSlots(me.hand.length, -1);
        const i = me.hand.indexOf(c);
        UI.mode = { type: 'aim', src: 'card', uid: c.uid, from: { x: hs[i].x, y: L.handY - 40 }, valid: new Set(g.validTargets(d.target, me).map((t) => t.uid)), sticky: false };
      }
    }
  }

  function onUp(e) {
    const p = toCanvas(e);
    UI.mouse.x = p.x; UI.mouse.y = p.y;
    UI.mouse.down = false;
    const g = UI.game;
    const tapped = Math.hypot(p.x - UI.mouse.downX, p.y - UI.mouse.downY) < 6;
    if (e.pointerType === 'touch' && tapped && UI.screen === 'game' && g && (!UI.mode || UI.mode.type === 'drag')) {
      const ht = hoverTarget();
      UI.inspect = ht ? { ht, t0: now() } : null;
    }
    if (!UI.mode || !g) return;
    const me = g.P(0);
    if (UI.mode.type === 'drag') {
      const c = g.handCard(me, UI.mode.uid);
      if (!c || p.y >= L.dropY) { UI.mode = null; return; }
      const d = g.def(c);
      if (d.type === 'minion') {
        const pos = insertIndex(me, p.x);
        if (g.needsTarget(me, c)) {
          const { gapPos } = boardSlots(me, pos);
          UI.mode = { type: 'aim', src: 'battlecry', uid: c.uid, pos, from: gapPos, valid: new Set(g.validTargets(d.target, me).map((t) => t.uid)), sticky: true };
          toast('CHOOSE A TARGET');
        } else act(() => g.playCard(me, c.uid, { pos }));
      } else if (!g.needsTarget(me, c)) {
        act(() => g.playCard(me, c.uid, {}));
      } else UI.mode = null;
      return;
    }
    if (UI.mode.type === 'aim' && !UI.mode.sticky) {
      const ht = hoverTarget();
      if (ht && ht.ent && UI.mode.valid.has(ht.ent.uid)) executeAim(ht.ent);
      else if (Math.hypot(p.x - UI.mouse.downX, p.y - UI.mouse.downY) < 6) UI.mode.sticky = true;
      else cancelMode();
    }
  }

  function executeAim(target) {
    const g = UI.game, me = g.P(0), m = UI.mode;
    UI.mode = null;
    if (m.src === 'attack') act(() => g.attack(m.uid, target.uid));
    else if (m.src === 'card') act(() => g.playCard(me, m.uid, { target: target.uid }));
    else if (m.src === 'battlecry') act(() => g.playCard(me, m.uid, { target: target.uid, pos: m.pos }));
    else if (m.src === 'power') act(() => g.usePower(me, target.uid));
  }

  function cancelMode() {
    if (UI.mode) UI.mode = null;
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (UI.mode) cancelMode();
      else if (UI.helpOpen) UI.helpOpen = false;
      else if (UI.screen === 'game' && !UI.game.s.over) UI.menuOpen = !UI.menuOpen;
    }
    if ((e.key === ' ' || e.key === 'Enter') && UI.screen === 'game' && myTurn() && !UI.menuOpen) {
      e.preventDefault();
      endTurn();
    }
    if (e.key === 'm' || e.key === 'M') Sound.toggle();
  }

  function endTurn() {
    if (!myTurn()) return;
    act(() => UI.game.endTurn());
  }

  // Immediate-mode button registration.
  function btn(x, y, w, h, label, fn, opts = {}) {
    const hover = UI.mouse.x >= x && UI.mouse.x <= x + w && UI.mouse.y >= y && UI.mouse.y <= y + h;
    R.button(UI.ctx, x, y, w, h, label, { ...opts, hover, down: hover && UI.mouse.down });
    UI.hits.push({ x, y, w, h, fn, disabled: opts.disabled });
    return hover;
  }

  // ============================================================== update
  function update(dt) {
    const g = UI.game;
    const k = 1 - Math.pow(0.0005, dt * UI.speed);
    if (g && (UI.screen === 'game')) {
      const me = g.P(0), op = g.P(1);
      const ht = UI.mode ? null : hoverTarget();
      const hoverIdx = ht && ht.type === 'hand' ? ht.idx : -1;
      // board targets
      for (const p of [me, op]) {
        let gap = null;
        if (p === me && UI.mode) {
          if (UI.mode.type === 'drag') {
            const c = g.handCard(me, UI.mode.uid);
            if (c && g.def(c).type === 'minion' && UI.mouse.y < L.dropY && me.board.length < 7) gap = insertIndex(me, UI.mouse.x);
          } else if (UI.mode.type === 'aim' && UI.mode.src === 'battlecry') gap = UI.mode.pos;
        }
        const { slots } = boardSlots(p, gap);
        p.board.forEach((m, i) => { const v = view(m.uid, slots[i].x, slots[i].y); v.tx = slots[i].x; v.ty = slots[i].y; });
      }
      const hs = handSlots(me.hand.length, hoverIdx);
      me.hand.forEach((c, i) => {
        const v = view(c.uid, L.deck[0].x, L.deck[0].y);
        if (UI.mode && UI.mode.type === 'drag' && UI.mode.uid === c.uid) { v.tx = UI.mouse.x; v.ty = UI.mouse.y; v.drag = true; }
        else if (UI.mode && UI.mode.type === 'aim' && (UI.mode.src === 'card' || UI.mode.src === 'battlecry') && UI.mode.uid === c.uid) { v.tx = hs[i].x; v.ty = hs[i].y - 24; v.drag = false; }
        else { v.tx = hs[i].x; v.ty = hs[i].y; v.drag = false; }
      });
      const es = enemyHandSlots(op.hand.length);
      op.hand.forEach((c, i) => { const v = view(c.uid, L.deck[1].x, L.deck[1].y); v.tx = es[i].x; v.ty = es[i].y; });
      for (const v of UI.views.values()) {
        const kk = v.drag ? 1 - Math.pow(0.00001, dt) : k;
        v.x += (v.tx - v.x) * kk;
        v.y += (v.ty - v.y) * kk;
        v.scale += (1 - v.scale) * k;
        v.flash = Math.max(0, v.flash - dt * 3 * UI.speed);
      }
      for (const hv of heroViews) hv.flash = Math.max(0, hv.flash - dt * 3 * UI.speed);
      // Garbage-collect views for entities that no longer exist.
      if (Math.random() < 0.02) {
        const alive = new Set();
        for (const p of [me, op]) { for (const m of p.board) alive.add(m.uid); for (const c of p.hand) alive.add(c.uid); }
        for (const uid of UI.views.keys()) if (!alive.has(uid) && !UI.views.get(uid).keep) {
          const v = UI.views.get(uid);
          if (!v.dying || now() - v.dying > 2000) UI.views.delete(uid);
        }
      }
    }
    for (const p of UI.particles) {
      p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    UI.particles = UI.particles.filter((p) => p.t < p.life);
    UI.shake = Math.max(0, UI.shake - dt * 30);
  }

  // ============================================================== drawing: game
  function lungeOffset(v, x, y) {
    if (!v || !v.lunge) return [0, 0];
    const l = v.lunge;
    const p = (now() - l.t0) / l.dur;
    if (p >= 1) { v.lunge = null; return [0, 0]; }
    const f = p < 0.5 ? ease(p * 2) : 1 - ease((p - 0.5) * 2);
    return [(l.tx - x) * 0.8 * f, (l.ty - y) * 0.8 * f];
  }

  function drawGame(ctx, t) {
    const g = UI.game;
    const me = g.P(0), op = g.P(1);
    const sx = UI.shake > 0 ? Math.round((Math.random() - 0.5) * UI.shake) : 0;
    const sy = UI.shake > 0 ? Math.round((Math.random() - 0.5) * UI.shake) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(R.background(), 0, 0);

    const ht = UI.menuOpen || g.s.over ? null : hoverTarget();
    const aiming = UI.mode && UI.mode.type === 'aim';
    const canAct = myTurn();

    // history column
    R.text(ctx, 'PLAYED', 20, 62, '#566c86', 1, { align: 'center' });
    const hist = g.s.history.slice(-8).reverse();
    hist.forEach((h, i) => {
      const hx = 8, hy = 70 + i * 24;
      R.box(ctx, hx, hy, 22, 22, h.player === 0 ? '#3b5dc9' : '#b13e53', K, 1);
      R.rect(ctx, hx + 2, hy + 2, 18, 18, K);
      R.sprite(ctx, CARDS[h.defId].sprite, hx + 3, hy + 3, 1);
    });

    // decks
    for (const p of [me, op]) {
      const d = L.deck[p.idx];
      const n = p.deck.length;
      const layers = Math.min(5, Math.ceil(n / 6));
      for (let i = 0; i < layers; i++) ctx.drawImage(R.cardBack(26, 36), d.x - 13 + i, d.y - 18 - i);
      if (n === 0) { R.box(ctx, d.x - 13, d.y - 18, 26, 36, '#1a1c2c', '#566c86', 2); }
      R.text(ctx, String(n), d.x + 2, d.y + 22, n ? '#f4f4f4' : '#ff8fb0', 1, { align: 'center', outline: K });
    }

    // enemy hand
    const es = enemyHandSlots(op.hand.length);
    op.hand.forEach((c) => { const v = UI.views.get(c.uid); if (v) ctx.drawImage(R.cardBack(26, 36), Math.round(v.x - 13), Math.round(v.y - 18)); });
    if (op.hand.length) R.text(ctx, op.hand.length + ' CARDS', 196, 28, '#94b0c2', 1, { align: 'center', outline: K });

    // heroes, powers, weapons
    for (const p of [op, me]) {
      const hp = L.hero[p.idx];
      const hv = heroViews[p.idx];
      const [ox, oy] = lungeOffset(hv, hp.x, hp.y);
      let glow = null;
      if (aiming && UI.mode.valid.has(p.hero.uid)) glow = p.idx === 0 ? '#a7f070' : '#b13e53';
      else if (canAct && p.idx === 0 && g.canAttack(p.hero) && !UI.mode) glow = '#a7f070';
      R.weapon(ctx, g, p, L.weapon[p.idx].x, L.weapon[p.idx].y);
      R.heroPower(ctx, g, p, L.power[p.idx].x, L.power[p.idx].y, { usable: p.idx === 0 && canAct && g.canUsePower(p) && !UI.mode });
      R.hero(ctx, g, p, hp.x + ox, hp.y + oy, { glow, flash: hv.flash }, t);
      R.text(ctx, HEROES[p.cls].name.toUpperCase(), hp.x, p.idx === 0 ? hp.y + 30 : hp.y - 34 < 0 ? hp.y + 30 : hp.y - 34, '#f4f4f4', 1, { align: 'center', outline: K });
    }

    // board
    let top = null;
    for (const p of [op, me]) {
      for (const m of p.board) {
        const v = UI.views.get(m.uid);
        if (!v) continue;
        if (v.lunge) { top = [m, v]; continue; }
        drawMinion(ctx, g, m, v, t, aiming, canAct);
      }
    }
    // battlecry ghost
    if (UI.mode && UI.mode.type === 'aim' && UI.mode.src === 'battlecry') {
      const c = g.handCard(me, UI.mode.uid);
      if (c) {
        const d = g.def(c);
        const ghost = { kind: 'minion', owner: 0, defId: d.id, atk: d.atk, hp: d.hp, maxHp: d.hp, taunt: !!d.kw.taunt, divineShield: !!d.kw.divineShield };
        ctx.globalAlpha = 0.7;
        R.minion(ctx, g, ghost, UI.mode.from.x, UI.mode.from.y, {}, t);
        ctx.globalAlpha = 1;
      }
    }
    // drop hint
    if (UI.mode && UI.mode.type === 'drag') {
      const c = g.handCard(me, UI.mode.uid);
      if (c && UI.mouse.y < L.dropY) {
        const d = g.def(c);
        if (d.type === 'minion') {
          const { gapPos } = boardSlots(me, insertIndex(me, UI.mouse.x));
          if (gapPos) R.ovalRing(ctx, gapPos.x - 22, gapPos.y - 27, 44, 54, 'rgba(167,240,112,0.7)', 1);
        } else {
          R.outline(ctx, 92, 66, 456, 164, 'rgba(167,240,112,0.6)', 2);
        }
      }
    }
    if (top) drawMinion(ctx, g, top[0], top[1], t, aiming, canAct);

    // effects under UI
    drawEffects(ctx, t);

    // arrows
    if (aiming) {
      const m = UI.mode;
      const hovered = ht && ht.ent && m.valid.has(ht.ent.uid) ? ht.ent : null;
      const tp = hovered ? posOf(hovered) : UI.mouse;
      R.arrow(ctx, m.from.x, m.from.y, tp.x, tp.y, hovered ? '#b13e53' : '#ffcd75', t);
      if (hovered) R.reticle(ctx, Math.round(tp.x), Math.round(tp.y), hovered.kind === 'hero' ? 26 : 24, '#b13e53', t);
    }
    if (UI.aiArrow) {
      const a = g.ent(UI.aiArrow.from), b = g.ent(UI.aiArrow.to);
      if (a && b) {
        const pa = posOf(a), pb = posOf(b);
        R.arrow(ctx, pa.x, pa.y, pb.x, pb.y, '#b13e53', t);
        R.reticle(ctx, Math.round(pb.x), Math.round(pb.y), 24, '#b13e53', t);
      }
    }

    // my hand
    const hoverIdx = !UI.mode && ht && ht.type === 'hand' ? ht.idx : -1;
    let dragged = null;
    me.hand.forEach((c, i) => {
      const v = UI.views.get(c.uid);
      if (!v) return;
      if (UI.mode && UI.mode.type === 'drag' && UI.mode.uid === c.uid) { dragged = [c, v]; return; }
      if (i === hoverIdx) return;
      drawHandCard(ctx, g, me, c, v, t, canAct);
    });
    ctx.restore();

    // ---------------- chrome (no shake)
    R.manaBar(ctx, me, W - 6, H - 12, true);
    R.manaBar(ctx, op, W - 6, 4, true);

    const et = L.endTurn;
    if (g.s.current === 0 && !g.s.over) {
      const noMoves = canAct && g.legalActions(me).length === 0;
      const pulse = noMoves && Math.sin(t / 180) > 0;
      btn(et.x, et.y, et.w, et.h, 'END TURN', endTurn, {
        disabled: !canAct,
        color: noMoves ? '#38b764' : '#e6a33c', hi: noMoves ? '#a7f070' : '#ffcd75', lo: noMoves ? '#1e5c3a' : '#8b5a3c',
        hover: pulse,
      });
    } else {
      R.button(ctx, et.x, et.y, et.w, et.h, 'ENEMY TURN', { disabled: true });
    }
    btn(4, 4, 34, 13, 'MENU', () => { UI.menuOpen = true; UI.mode = null; }, { color: '#566c86', hi: '#94b0c2', lo: '#333c57', textColor: '#f4f4f4' });

    if (dragged) {
      const [c, v] = dragged;
      ctx.drawImage(R.smallCard(c.defId), Math.round(v.x - 26), Math.round(v.y - 36));
    }

    // hover previews
    if (UI.inspect && now() - UI.inspect.t0 > 3000) UI.inspect = null;
    const touchHt = UI.inspect && UI.mouse.down === false ? UI.inspect.ht : null;
    if (!UI.mode && !UI.showCard && (touchHt || ht)) drawHover(ctx, g, touchHt || ht, t);
    if (UI.mode && UI.mode.type === 'aim' && UI.mode.src === 'battlecry') R.text(ctx, 'RIGHT-CLICK TO CANCEL', 320, 146, '#f4f4f4', 1, { align: 'center', outline: K });

    // enemy card reveal
    if (UI.showCard) {
      const s = UI.showCard;
      const p = (now() - s.t0) / s.dur;
      if (p >= 1) UI.showCard = null;
      else {
        const slide = Math.min(1, p * 6);
        const x = Math.round(-110 + 214 * ease(slide));
        if (s.power) {
          const pw = HEROES[s.power].power;
          R.panel(ctx, x, 110, 104, 60, '#1a1c2c', HEROES[s.power].color);
          R.sprite(ctx, pw.icon, x + 8, 118, 2);
          R.text(ctx, pw.name.toUpperCase(), x + 44, 120, '#ffcd75');
          Font.wrap(pw.text.toUpperCase(), 54).forEach((ln, i) => R.text(ctx, ln, x + 44, 130 + i * 7, '#f4f4f4'));
          R.text(ctx, 'HERO POWER', x + 52, 160, '#94b0c2', 1, { align: 'center' });
        } else {
          ctx.drawImage(R.bigCard(s.defId), x, 72);
        }
      }
    }

    // burned cards
    for (const e of UI.effects) if (e.type === 'burn') {
      const p = (now() - e.t0) / e.dur;
      const d = L.deck[e.owner];
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.drawImage(R.smallCard(e.defId), d.x - 70, d.y - 36 - p * 20);
      R.text(ctx, 'BURNED!', d.x - 44, d.y + 40, '#ef7d57', 1, { align: 'center', outline: K });
      ctx.globalAlpha = 1;
    }

    drawBanner(ctx, t);
    drawToast(ctx);

    if (UI.menuOpen) drawMenu(ctx);
    if (g.s.over && now() - UI.overAt > 1400) drawOver(ctx, t);
  }

  function drawMinion(ctx, g, m, v, t, aiming, canAct) {
    let glow = null;
    if (aiming && UI.mode.valid.has(m.uid)) glow = m.owner === 0 ? '#a7f070' : '#b13e53';
    else if (!UI.mode && canAct && m.owner === 0 && g.canAttack(m)) glow = '#a7f070';
    const [ox, oy] = lungeOffset(v, v.x, v.y);
    let alpha = 1;
    let flash = v.flash;
    if (v.dying) {
      const p = (now() - v.dying) / (380 / UI.speed);
      flash = Math.min(1, p * 2);
      alpha = Math.max(0, 1 - p);
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = v.x + ox, cy = v.y + oy;
    if (v.scale < 0.99) {
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.scale(v.scale, v.scale);
      ctx.translate(-Math.round(cx), -Math.round(cy));
    }
    R.minion(ctx, g, m, cx, cy, { glow, flash }, t);
    ctx.restore();
    if (m.sick && !m.charge && !m.rush && !v.dying && g.s.current === m.owner) {
      const zt = (t / 900 + m.uid * 0.37) % 1;
      ctx.globalAlpha = 1 - zt;
      R.zzz(ctx, Math.round(cx + 12 + zt * 6), Math.round(cy - 24 - zt * 12), 1);
      if (zt > 0.4) R.zzz(ctx, Math.round(cx + 18 + zt * 4), Math.round(cy - 32 - zt * 8), 1);
      ctx.globalAlpha = 1;
    }
  }

  function drawHandCard(ctx, g, me, c, v, t, canAct) {
    const x = Math.round(v.x - 26), y = Math.round(v.y - 36);
    if (canAct && g.canPlay(me, c)) {
      const a = 0.6 + 0.4 * Math.sin(t / 200);
      ctx.globalAlpha = a;
      R.box(ctx, x - 2, y - 2, 56, 76, '#a7f070', '#a7f070', 3);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(R.smallCard(c.defId, { cost: g.cardCost(me, c) }), x, y);
  }

  function drawHover(ctx, g, ht, t) {
    if (ht.type === 'hand') {
      const c = ht.card;
      const s = handSlots(g.P(0).hand.length, ht.idx)[ht.idx];
      const x = clamp(Math.round(s.x - 52), 44, W - 108);
      const y = H - 150;
      if (myTurn() && g.canPlay(g.P(0), c)) R.box(ctx, x - 2, y - 2, 108, 152, '#a7f070', '#a7f070', 4);
      ctx.drawImage(R.bigCard(c.defId, { cost: g.cardCost(g.P(0), c) }), x, y);
      if (x + 108 + 94 < W) R.keywordTips(ctx, c.defId, x + 108, y);
      else R.keywordTips(ctx, c.defId, x - 96, y);
      return;
    }
    if (ht.type === 'minion') {
      const m = ht.ent;
      const v = UI.views.get(m.uid);
      if (!v) return;
      const right = v.x < 400;
      const x = right ? Math.round(v.x + 30) : Math.round(v.x - 30 - 104);
      const y = clamp(Math.round(v.y - 74), 4, H - 152);
      ctx.drawImage(R.bigCard(m.defId, { atk: g.atkOf(m), hp: m.hp, maxHp: m.maxHp, silenced: m.silenced }), x, y);
      const tipX = right ? x + 106 : x - 94;
      R.keywordTips(ctx, m.defId, tipX, y);
      return;
    }
    if (ht.type === 'power') {
      const p = ht.p;
      const pw = HEROES[p.cls].power;
      const pp = L.power[p.idx];
      const x = pp.x + 20, y = p.idx === 0 ? pp.y - 56 : pp.y + 10;
      R.panel(ctx, x, y, 110, 48);
      R.text(ctx, pw.name.toUpperCase(), x + 6, y + 6, '#ffcd75');
      R.text(ctx, `${pw.cost} MANA - HERO POWER`, x + 6, y + 14, '#73eff7');
      Font.wrap(pw.text.toUpperCase(), 98).forEach((ln, i) => R.text(ctx, ln, x + 6, y + 24 + i * 7, '#f4f4f4'));
      return;
    }
    if (ht.type === 'weapon') {
      const p = ht.p;
      const wp = L.weapon[p.idx];
      const w = p.weapon;
      ctx.drawImage(R.bigCard(w.defId, { atk: w.atk, hp: w.dur }), wp.x - 124, clamp(wp.y - 74, 4, H - 152));
      return;
    }
    if (ht.type === 'history') {
      const h = ht.entry;
      ctx.drawImage(R.bigCard(h.defId), 36, clamp(UI.mouse.y - 74, 4, H - 152));
      R.text(ctx, h.player === 0 ? 'PLAYED BY YOU' : 'PLAYED BY ENEMY', 88, clamp(UI.mouse.y - 74, 4, H - 152) + 152, h.player === 0 ? '#41a6f6' : '#ff8fb0', 1, { align: 'center', outline: K });
      return;
    }
    if (ht.type === 'hero') {
      const p = ht.p;
      const hp = L.hero[p.idx];
      const hd = HEROES[p.cls];
      const x = hp.x - 150, y = p.idx === 0 ? hp.y - 40 : hp.y - 10;
      R.panel(ctx, x, y, 110, 34);
      R.text(ctx, hd.name.toUpperCase() + ' THE ' + hd.title.toUpperCase(), x + 6, y + 6, '#ffcd75');
      R.text(ctx, `HEALTH ${p.hero.hp}/${p.hero.maxHp}` + (p.hero.armor ? `  ARMOR ${p.hero.armor}` : ''), x + 6, y + 15, '#f4f4f4');
      R.text(ctx, `DECK ${p.deck.length}  HAND ${p.hand.length}`, x + 6, y + 23, '#94b0c2');
    }
  }

  function drawEffects(ctx, t) {
    const tn = now();
    for (const e of UI.effects) {
      const p = (tn - e.t0) / e.dur;
      if (e.type === 'proj') {
        const u = Math.min(1, p);
        const arc = Math.sin(u * Math.PI) * -24;
        const x = e.x0 + (e.x1 - e.x0) * ease(u), y = e.y0 + (e.y1 - e.y0) * ease(u) + arc;
        const [c1, c2, size] = e.spec;
        particle(x, y, { col: Math.random() < 0.5 ? c1 : c2, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, g: 0, life: 0.3, size: 2 });
        R.rect(ctx, x - size - 1, y - size - 1, size * 2 + 2, size * 2 + 2, K);
        R.rect(ctx, x - size, y - size, size * 2, size * 2, c1);
        R.rect(ctx, x - size / 2, y - size / 2, size, size, c2);
        if (p >= 1 && !e.done) { e.done = true; e.resolve(); }
      } else if (e.type === 'float') {
        const y = e.y - ease(Math.min(1, p)) * 22;
        ctx.globalAlpha = p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;
        R.text(ctx, e.str, e.x, y, e.col, e.scale, { align: 'center', outline: K });
        ctx.globalAlpha = 1;
      } else if (e.type === 'flash') {
        ctx.globalAlpha = Math.max(0, 0.35 * (1 - p));
        R.rect(ctx, 0, 0, W, H, e.col);
        ctx.globalAlpha = 1;
      } else if (e.type === 'slash') {
        const u = Math.min(1, p * 1.5);
        for (let i = -16; i < -16 + 32 * u; i++) {
          R.rect(ctx, e.x + i - 1, e.y + i - 1, 4, 4, K);
          R.rect(ctx, e.x + i, e.y + i, 2, 2, '#f4f4f4');
        }
      }
    }
    for (const p of UI.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      R.rect(ctx, p.x, p.y, p.size, p.size, p.col);
    }
    ctx.globalAlpha = 1;
    UI.effects = UI.effects.filter((e) => (tn - e.t0) / e.dur < 1 || (e.type === 'proj' && !e.done));
  }

  function drawBanner(ctx, t) {
    const b = UI.banner;
    if (!b) return;
    const p = (now() - b.t0) / b.dur;
    if (p >= 1) { UI.banner = null; return; }
    const a = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1;
    ctx.globalAlpha = a;
    const h = b.small ? 24 : 36;
    R.rect(ctx, 0, 148 - h / 2, W, h, 'rgba(26,28,44,0.85)');
    R.rect(ctx, 0, 148 - h / 2, W, 1, b.col);
    R.rect(ctx, 0, 148 + h / 2 - 1, W, 1, b.col);
    const sc = b.small ? 2 : 4;
    R.text(ctx, b.text, 320, 148 - (5 * sc) / 2, b.col, sc, { align: 'center', outline: K, outlineW: 2 });
    ctx.globalAlpha = 1;
  }

  function drawToast(ctx) {
    const tm = UI.toastMsg;
    if (!tm) return;
    const p = (now() - tm.t0) / 1400;
    if (p >= 1) { UI.toastMsg = null; return; }
    ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
    const w = Font.measure(tm.msg) + 16;
    R.panel(ctx, 320 - w / 2, 214, w, 15, '#1a1c2c', '#ffcd75');
    R.text(ctx, tm.msg, 320, 219, '#ffcd75', 1, { align: 'center' });
    ctx.globalAlpha = 1;
  }

  // Swallow clicks that land outside an overlay's buttons.
  function blockInput() { UI.hits.push({ x: 0, y: 0, w: W, h: H, fn: () => {}, silent: true }); }

  function drawMenu(ctx) {
    R.rect(ctx, 0, 0, W, H, 'rgba(26,28,44,0.7)');
    blockInput();
    R.panel(ctx, 240, 90, 160, 160);
    R.text(ctx, 'PAUSED', 320, 102, '#ffcd75', 2, { align: 'center', outline: K });
    btn(260, 124, 120, 18, 'RESUME', () => { UI.menuOpen = false; });
    btn(260, 148, 120, 18, 'SPEED: ' + UI.speed + 'X', () => { UI.speed = UI.speed === 1 ? 2 : UI.speed === 2 ? 3 : 1; });
    btn(260, 172, 120, 18, Sound.muted ? 'SOUND: OFF' : 'SOUND: ON', () => Sound.toggle());
    btn(260, 196, 120, 18, 'HOW TO PLAY', () => { UI.helpOpen = true; });
    btn(260, 220, 120, 18, 'CONCEDE', () => {
      UI.menuOpen = false;
      const g = UI.game;
      if (!g.s.over) { g.s.players[0].hero.hp = 0; g.checkEnd(); }
    }, { color: '#b13e53', hi: '#ef7d57', lo: '#73172d', textColor: '#f4f4f4' });
    if (UI.helpOpen) drawHelp(ctx);
  }

  function drawOver(ctx, t) {
    const g = UI.game;
    const p = Math.min(1, (now() - UI.overAt - 1400) / 400);
    ctx.globalAlpha = p * 0.75;
    R.rect(ctx, 0, 0, W, H, K);
    ctx.globalAlpha = 1;
    blockInput();
    const win = g.s.winner === 0;
    const draw = g.s.winner === -1;
    const title = draw ? 'DRAW' : win ? 'VICTORY!' : 'DEFEAT';
    const col = draw ? '#94b0c2' : win ? '#ffcd75' : '#b13e53';
    const bounce = Math.round(Math.sin(t / 250) * 3);
    const sc = 6;
    R.text(ctx, title, 322, 84 + bounce, K, sc, {align: 'center'});
    R.text(ctx, title, 320, 80 + bounce, col, sc, { align: 'center', outline: K, outlineW: 2 });
    const hd = HEROES[g.P(win || draw ? 0 : 1).cls];
    R.panel(ctx, 296, 126, 48, 48, '#29366f', col);
    R.sprite(ctx, hd.sprite, 296 + 0, 126 + 0, 2);
    const turns = Math.ceil(g.s.turn / 2);
    R.text(ctx, `${hd.name.toUpperCase()} WINS IN ${turns} TURNS`, 320, 186, '#f4f4f4', 1, { align: 'center' });
    btn(236, 206, 80, 20, 'REMATCH', () => startMatch(UI.playerCls));
    btn(324, 206, 80, 20, 'MAIN MENU', () => { UI.screen = 'title'; UI.game = null; });
  }

  function drawHelp(ctx) {
    R.rect(ctx, 0, 0, W, H, 'rgba(26,28,44,0.85)');
    blockInput();
    R.panel(ctx, 110, 26, 420, 308);
    R.text(ctx, 'HOW TO PLAY', 320, 38, '#ffcd75', 2, { align: 'center', outline: K });
    const lines = [
      ['~GOAL~', 'REDUCE THE ENEMY HERO FROM 30 HEALTH TO 0.'],
      ['~MANA~', 'YOU GAIN A MANA CRYSTAL EACH TURN (UP TO 10). CARDS COST MANA.'],
      ['~PLAY CARDS~', 'DRAG A CARD FROM YOUR HAND ONTO THE BOARD. TARGETED SPELLS TURN INTO AN ARROW - DROP IT ON A TARGET.'],
      ['~ATTACK~', 'DRAG FROM A GLOWING MINION (OR CLICK IT) TO AN ENEMY. MINIONS NEED A TURN BEFORE ATTACKING UNLESS THEY HAVE CHARGE OR RUSH.'],
      ['~TAUNT~', 'ENEMY TAUNT MINIONS MUST BE ATTACKED FIRST.'],
      ['~HERO POWER~', 'CLICK THE ROUND BUTTON NEXT TO YOUR HERO. ONCE PER TURN.'],
      ['~WEAPONS~', 'LET YOUR HERO ATTACK. DURABILITY DROPS WITH EACH ATTACK.'],
      ['~CONTROLS~', 'HOVER ANYTHING TO INSPECT IT. RIGHT-CLICK OR ESC CANCELS. SPACE ENDS YOUR TURN. M MUTES.'],
    ];
    let y = 58;
    for (const [head, body] of lines) {
      R.text(ctx, head, 124, y, '#f4f4f4', 1, { hi: '#ffcd75' });
      const wr = Font.wrap(body, 300);
      wr.forEach((ln, i) => R.text(ctx, ln, 210, y + i * 8, '#f4f4f4'));
      y += Math.max(1, wr.length) * 8 + 8;
    }
    btn(280, 306, 80, 18, 'GOT IT', () => { UI.helpOpen = false; });
  }

  // ============================================================== other screens
  const PARADE = ['goblin', 'slime', 'bat', 'imp', 'croc', 'robot', 'owl', 'golem', 'knight', 'orc', 'yeti', 'dragon', 'lich', 'fairy', 'dino', 'sheep', 'wizard', 'lion', 'spider', 'elemental'];

  function drawLogo(ctx, cx, y, sc, t) {
    const title = 'CARDIHERO';
    const w = Font.measure(title, sc);
    const x = Math.round(cx - w / 2);
    // shadow + outline
    Font.draw(ctx, title, x + 2, y + 4, K, sc, { outline: K, outlineW: 2 });
    Font.draw(ctx, title, x, y, '#ffcd75', sc, { outline: K, outlineW: 2 });
    ctx.save();
    ctx.beginPath(); ctx.rect(x - sc, y + sc * 3, w + sc * 2, sc * 3); ctx.clip();
    Font.draw(ctx, title, x, y, '#ef7d57', sc);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(x - sc, y, w + sc * 2, sc); ctx.clip();
    Font.draw(ctx, title, x, y, '#fff2d6', sc);
    ctx.restore();
    // sparkle sweep
    const sweep = ((t / 12) % (w + 200)) - 100;
    ctx.save();
    ctx.beginPath(); ctx.rect(x + sweep, y, sc * 2, sc * 5); ctx.clip();
    Font.draw(ctx, title, x, y, '#ffffff', sc);
    ctx.restore();
  }

  function drawTitle(ctx, t) {
    ctx.drawImage(R.background(), 0, 0);
    R.rect(ctx, 0, 0, W, H, 'rgba(26,28,44,0.55)');
    const bob = Math.round(Math.sin(t / 500) * 2);
    drawLogo(ctx, 320, 64 + bob, 7, t);
    R.text(ctx, 'A PIXEL CARD BATTLER', 320, 116, '#94b0c2', 2, { align: 'center', outline: K });
    // fanned cards
    const showcase = ['fireball', 'doom_dragon', 'lightbringer', 'tyrant_rex', 'blood_warlord'];
    showcase.forEach((id, i) => {
      const x = 320 + (i - 2) * 58 - 26;
      const y = 142 + Math.abs(i - 2) * 6 + Math.round(Math.sin(t / 400 + i) * 2);
      ctx.drawImage(R.smallCard(id), x, y);
    });
    btn(260, 236, 120, 22, 'PLAY', () => { UI.screen = 'select'; }, { scale: 2 });
    btn(260, 264, 120, 16, 'HOW TO PLAY', () => { UI.helpOpen = true; });
    btn(260, 286, 120, 16, Sound.muted ? 'SOUND: OFF' : 'SOUND: ON', () => Sound.toggle(), { color: '#566c86', hi: '#94b0c2', lo: '#333c57', textColor: '#f4f4f4' });
    // parade
    const n = PARADE.length;
    for (let i = 0; i < n; i++) {
      const x = ((i * 40 + t / 30) % (n * 40)) - 40;
      const hop = Math.abs(Math.sin(t / 180 + i)) * 4;
      R.sprite(ctx, PARADE[i], Math.round(x), Math.round(330 - hop), 2);
    }
    R.text(ctx, 'V1.0', 632, 350, '#566c86', 1, { align: 'right' });
    if (UI.helpOpen) drawHelp(ctx);
  }

  function drawSelect(ctx, t) {
    ctx.drawImage(R.background(), 0, 0);
    R.rect(ctx, 0, 0, W, H, 'rgba(26,28,44,0.7)');
    R.text(ctx, 'CHOOSE YOUR HERO', 320, 18, '#ffcd75', 3, { align: 'center', outline: K });
    const classes = Object.keys(HEROES);
    const pw = 136, ph = 222, gap = 12;
    const x0 = 320 - (classes.length * pw + (classes.length - 1) * gap) / 2;
    classes.forEach((cls, i) => {
      const hd = HEROES[cls];
      const x = x0 + i * (pw + gap), y = 50;
      const hover = UI.mouse.x >= x && UI.mouse.x <= x + pw && UI.mouse.y >= y && UI.mouse.y <= y + ph;
      const lift = hover ? -3 : 0;
      R.panel(ctx, x, y + lift, pw, ph, hover ? hd.dark : '#1a1c2c', hover ? hd.color : '#566c86');
      R.box(ctx, x + pw / 2 - 38, y + 10 + lift, 76, 76, hd.dark, hd.color, 2);
      R.sprite(ctx, hd.sprite, x + pw / 2 - 36, y + 12 + lift + (hover ? Math.round(Math.sin(t / 150)) : 0), 3);
      R.text(ctx, hd.name.toUpperCase(), x + pw / 2, y + 94 + lift, '#f4f4f4', 2, { align: 'center', outline: K });
      R.text(ctx, 'THE ' + hd.title.toUpperCase(), x + pw / 2, y + 110 + lift, hd.color, 1, { align: 'center' });
      R.rect(ctx, x + 10, y + 121 + lift, pw - 20, 1, '#333c57');
      R.sprite(ctx, hd.power.icon, x + 10, y + 128 + lift, 1);
      R.text(ctx, hd.power.name.toUpperCase(), x + 30, y + 130 + lift, '#ffcd75');
      R.text(ctx, '(' + hd.power.cost + ' MANA)', x + 30, y + 138 + lift, '#73eff7');
      Font.wrap(hd.power.text.toUpperCase(), pw - 20).forEach((ln, k) => R.text(ctx, ln, x + 10, y + 150 + k * 7 + lift, '#f4f4f4'));
      const style = { mage: 'SPELLS & FREEZE', warrior: 'ARMOR & WEAPONS', paladin: 'BUFFS & DIVINE SHIELD', hunter: 'BEASTS & AGGRESSION' }[cls];
      R.text(ctx, 'STYLE:', x + 10, y + 176 + lift, '#566c86');
      R.text(ctx, style, x + 10, y + 184 + lift, '#94b0c2');
      const legend = DECKS[cls].map((id) => CARDS[id]).find((d) => d.rarity === 'legendary');
      if (legend) { R.text(ctx, 'LEGEND:', x + 10, y + 196 + lift, '#566c86'); R.text(ctx, legend.name.toUpperCase(), x + 10, y + 204 + lift, '#ef7d57'); }
      UI.hits.push({ x, y, w: pw, h: ph, fn: () => startMatch(cls) });
    });
    btn(20, 330, 70, 18, 'BACK', () => { UI.screen = 'title'; }, { color: '#566c86', hi: '#94b0c2', lo: '#333c57', textColor: '#f4f4f4' });
    btn(236, 290, 168, 20, 'AI: ' + UI.difficulty.toUpperCase(), () => { UI.difficulty = UI.difficulty === 'normal' ? 'easy' : 'normal'; }, { color: '#566c86', hi: '#94b0c2', lo: '#333c57', textColor: '#f4f4f4' });
    R.text(ctx, 'OPPONENT IS A RANDOM OTHER HERO', 320, 318, '#94b0c2', 1, { align: 'center' });
  }

  function drawMulligan(ctx, t) {
    const g = UI.game;
    ctx.drawImage(R.background(), 0, 0);
    R.rect(ctx, 0, 0, W, H, 'rgba(26,28,44,0.75)');
    const first = UI.mull.first === 0;
    R.text(ctx, first ? 'YOU GO FIRST' : 'YOU GO SECOND', 320, 16, '#ffcd75', 3, { align: 'center', outline: K });
    R.text(ctx, 'CLICK CARDS TO REPLACE THEM', 320, 40, '#94b0c2', 1, { align: 'center' });
    const me = g.P(0), op = g.P(1);
    R.text(ctx, `${HEROES[me.cls].name.toUpperCase()} VS ${HEROES[op.cls].name.toUpperCase()} THE ${HEROES[op.cls].title.toUpperCase()}`, 320, 50, '#f4f4f4', 1, { align: 'center' });
    const n = me.hand.length;
    const gap = 12, cw = 104;
    const x0 = 320 - (n * cw + (n - 1) * gap) / 2;
    me.hand.forEach((c, i) => {
      const x = Math.round(x0 + i * (cw + gap)), y = 66;
      const hover = UI.mouse.x >= x && UI.mouse.x <= x + cw && UI.mouse.y >= y && UI.mouse.y <= y + 148;
      const sel = UI.mull.selected.has(c.uid);
      ctx.drawImage(R.bigCard(c.defId), x, y - (hover ? 3 : 0));
      if (sel) {
        ctx.globalAlpha = 0.55; R.rect(ctx, x, y - (hover ? 3 : 0), cw, 148, K); ctx.globalAlpha = 1;
        const cx = x + cw / 2, cy = y + 64 - (hover ? 3 : 0);
        for (let k = -16; k <= 16; k++) {
          R.rect(ctx, cx + k - 2, cy + k - 2, 5, 5, K); R.rect(ctx, cx + k - 2, cy - k - 2, 5, 5, K);
        }
        for (let k = -16; k <= 16; k++) { R.rect(ctx, cx + k - 1, cy + k - 1, 3, 3, '#b13e53'); R.rect(ctx, cx + k - 1, cy - k - 1, 3, 3, '#b13e53'); }
        R.text(ctx, 'REPLACE', cx, y + 108, '#ff8fb0', 1, { align: 'center', outline: K });
      }
      UI.hits.push({ x, y, w: cw, h: 148, fn: () => { sel ? UI.mull.selected.delete(c.uid) : UI.mull.selected.add(c.uid); } });
    });
    if (!first) {
      ctx.drawImage(R.smallCard('coin'), 560, 90);
      R.text(ctx, '+ THE COIN', 586, 168, '#ffcd75', 1, { align: 'center', outline: K });
    }
    btn(270, 236, 100, 22, 'CONFIRM', () => confirmMulligan(), { scale: 2 });
  }

  // ============================================================== main loop
  let lastT = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0);
    lastT = ts;
    update(dt);
    const ctx = UI.ctx;
    UI.hits = [];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = K;
    ctx.fillRect(0, 0, W, H);
    try {
      if (UI.screen === 'title') drawTitle(ctx, ts);
      else if (UI.screen === 'select') { drawSelect(ctx, ts); if (UI.helpOpen) drawHelp(ctx); }
      else if (UI.screen === 'mulligan') drawMulligan(ctx, ts);
      else if (UI.screen === 'game') drawGame(ctx, ts);
      if (UI.screen !== 'game') { drawEffects(ctx, ts); }
    } catch (e) { console.error(e); }
    // hand cursor
    requestAnimationFrame(frame);
  }

  function resize() {
    const c = UI.canvas;
    const sw = window.innerWidth, sh = window.innerHeight;
    let s = Math.min(sw / W, sh / H);
    if (s >= 2) s = Math.floor(s); // integer scaling keeps pixels crisp
    c.style.width = Math.floor(W * s) + 'px';
    c.style.height = Math.floor(H * s) + 'px';
  }

  function boot() {
    const c = document.getElementById('game');
    UI.canvas = c;
    UI.ctx = c.getContext('2d');
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); onDown(e); });
    c.addEventListener('pointermove', onMove);
    c.addEventListener('pointerup', onUp);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
  }

  root.UI = UI;
  root.bootGame = boot;
  root.startMatch = startMatch;
})(window);
