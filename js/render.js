// Drawing primitives and game components. Everything is drawn on a 640x360 canvas.
(function (root) {
  const W = 640, H = 360;
  const PAL = Sprites.PAL;
  const K = PAL.k;

  const CLASS_COL = {
    neutral: ['#94b0c2', '#566c86', '#333c57'],
    mage: ['#41a6f6', '#3b5dc9', '#29366f'],
    warrior: ['#ef7d57', '#b13e53', '#73172d'],
    paladin: ['#ffcd75', '#e6a33c', '#8b5a3c'],
    hunter: ['#a7f070', '#38b764', '#1e5c3a'],
  };
  const RARITY_COL = { common: '#f4f4f4', rare: '#41a6f6', epic: '#b55ac8', legendary: '#ef7d57' };

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }

  function rect(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

  // Box with cut corners and a 1px outline.
  function box(ctx, x, y, w, h, fill, edge = K, cut = 1) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = edge;
    ctx.fillRect(x + cut, y, w - cut * 2, h);
    ctx.fillRect(x, y + cut, w, h - cut * 2);
    if (cut > 1) ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x + cut, y + 1, w - cut * 2, h - 2);
    ctx.fillRect(x + 1, y + cut, w - 2, h - cut * 2);
    if (cut > 1) ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  }

  // Hollow rectangle outline.
  function outline(ctx, x, y, w, h, col, t = 1) {
    rect(ctx, x, y, w, t, col); rect(ctx, x, y + h - t, w, t, col);
    rect(ctx, x, y + t, t, h - t * 2, col); rect(ctx, x + w - t, y + t, t, h - t * 2, col);
  }

  function ovalSpans(w, h) {
    const spans = [];
    const a = w / 2, b = h / 2;
    for (let y = 0; y < h; y++) {
      const dy = (y + 0.5 - b) / b;
      const hw = a * Math.sqrt(Math.max(0, 1 - dy * dy));
      const x0 = Math.round(a - hw);
      spans.push([x0, w - x0]);
    }
    return spans;
  }
  function oval(ctx, x, y, w, h, col) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = col;
    const s = ovalSpans(w, h);
    for (let i = 0; i < s.length; i++) if (s[i][1] > s[i][0]) ctx.fillRect(x + s[i][0], y + i, s[i][1] - s[i][0], 1);
  }
  function ovalRing(ctx, x, y, w, h, col, t = 1) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = col;
    const outer = ovalSpans(w, h);
    const inner = ovalSpans(w - t * 2, h - t * 2);
    for (let i = 0; i < h; i++) {
      const [a0, a1] = outer[i];
      const ii = i - t;
      if (ii < 0 || ii >= inner.length || inner[ii][1] <= inner[ii][0]) { if (a1 > a0) ctx.fillRect(x + a0, y + i, a1 - a0, 1); continue; }
      const b0 = inner[ii][0] + t, b1 = inner[ii][1] + t;
      ctx.fillRect(x + a0, y + i, b0 - a0, 1);
      ctx.fillRect(x + b1, y + i, a1 - b1, 1);
    }
  }

  function sprite(ctx, name, x, y, scale = 1, mode = 'n') {
    const s = Sprites.get(name, mode);
    ctx.drawImage(s, Math.round(x), Math.round(y), s.width * scale, s.height * scale);
  }

  const text = (ctx, t, x, y, col, scale, opts) => Font.draw(ctx, t, x, y, col, scale, opts);

  // ------------------------------------------------------------ stat gems
  const PATS = {
    hp: [
      '.....k.....', '....krk....', '...krrrk...', '..krirrrk..', '.krirrrrrk.', '.krrrrrrrk.',
      'krrrrrrrrrk', 'krrrrrrrrrk', '.krrrrrrrk.', '..kmmmmmk..', '...kkkkk...',
    ],
    atk: [
      '...kkkkk...', '..kyyyyyk..', '.kyyqqqqqk.', 'kyyqqqqqqqk', 'kyqqqqqqqqk', 'kyqqqqqqqqk',
      'kqqqqqqqqhk', 'kqqqqqqqqhk', '.kqqqqqqhk.', '..khhhhhk..', '...kkkkk...',
    ],
    mana: [
      '...kkkkk...', '..kaaccck..', '.kaccccbbk.', 'kaccccbbbbk', 'kccccbbbbbk', 'kcccbbbbbbk',
      'kccbbbbbbnk', 'kcbbbbbbbnk', '.kbbbbbbnk.', '..knnnnnk..', '...kkkkk...',
    ],
    armor: [
      'kkkkkkkkkkk', 'kwsssssssdk', 'kssssssssdk', 'kssssssssdk', 'kssssssssdk', '.kssssssdk.',
      '.kssssssdk.', '..ksssddk..', '...ksddk...', '....kdk....', '.....k.....',
    ],
    dur: [
      '...kkkkk...', '..kssssdk..', '.kssssssdk.', 'kssssssssdk', 'kssssssssdk', 'kssssssssdk',
      'kssssssssdk', 'kdssssssddk', '.kddddddk..', '..kddddk...', '...kkkkk...',
    ],
    lock: [
      '...kkkkk...', '..keeeeek..', '.keeeeeeek.', 'keeeeeeeeek', 'keeeeeeeeek', 'keeeeeeeeek',
      'keeeeeeeeek', 'keeeeeeeeek', '.keeeeeeek.', '..keeeeek..', '...kkkkk...',
    ],
  };
  const patCache = {};
  function pat(name) {
    if (patCache[name]) return patCache[name];
    const rows = PATS[name];
    const [c, x] = mk(rows[0].length, rows.length);
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch === '.') continue;
      x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1);
    }
    return (patCache[name] = c);
  }

  // Draw a stat gem with a number, centered at (cx, cy).
  function gem(ctx, kind, value, cx, cy, scale = 1, col = '#f4f4f4') {
    const p = pat(kind);
    const w = p.width * scale, h = p.height * scale;
    ctx.drawImage(p, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
    if (value == null) return;
    const s = String(value);
    const dy = kind === 'hp' ? 1 : 0;
    text(ctx, s, cx + (s.length > 1 ? 0 : 0.5 * scale), Math.round(cy - 2.5 * scale + dy * scale), col, scale, { align: 'center', outline: K });
  }

  // ------------------------------------------------------------ small keyword icons (5x5)
  const MINI = {
    skull: ['.###.', '#.#.#', '#####', '.###.', '.#.#.'],
    bolt: ['..##.', '.##..', '####.', '..##.', '.##..'],
    drop: ['..#..', '.###.', '#####', '#####', '.###.'],
    heart: ['##.##', '#####', '#####', '.###.', '..#..'],
    swirl: ['.###.', '#...#', '#.#.#', '#..#.', '.##..'],
    wand: ['....#', '...#.', '..#..', '.#...', '#....'],
  };
  // Little "z" used for sleeping minions.
  function zzz(ctx, x, y, s = 1) {
    const rows = ['####', '..#.', '.#..', '####'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (rows[j][i] === '#') {
      rect(ctx, x + i * s - 1, y + j * s - 1, s + 2, s + 2, K);
    }
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (rows[j][i] === '#') rect(ctx, x + i * s, y + j * s, s, s, '#f4f4f4');
  }

  function mini(ctx, name, x, y, col) {
    const rows = MINI[name];
    ctx.fillStyle = K;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (rows[j][i] === '#') {
      ctx.fillRect(x + i - 1, y + j, 1, 1); ctx.fillRect(x + i + 1, y + j, 1, 1);
      ctx.fillRect(x + i, y + j - 1, 1, 1); ctx.fillRect(x + i, y + j + 1, 1, 1);
    }
    ctx.fillStyle = col;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (rows[j][i] === '#') ctx.fillRect(x + i, y + j, 1, 1);
  }

  // ------------------------------------------------------------ background
  let bgCanvas = null;
  function background() {
    if (bgCanvas) return bgCanvas;
    const [c, x] = mk(W, H);
    // Stone floor
    rect(x, 0, 0, W, H, '#1a1c2c');
    for (let ty = 0; ty < H; ty += 16) {
      for (let tx = (ty / 16) % 2 ? -8 : 0; tx < W; tx += 16) {
        const shade = ((tx * 7 + ty * 13) % 5 === 0) ? '#29366f' : '#222a44';
        rect(x, tx + 1, ty + 1, 14, 14, shade);
        rect(x, tx + 1, ty + 1, 14, 1, '#2c3656');
      }
    }
    // Wooden table frame
    const fx = 90, fy = 64, fw = 460, fh = 168;
    rect(x, fx - 10, fy - 10, fw + 20, fh + 20, K);
    rect(x, fx - 9, fy - 9, fw + 18, fh + 18, '#4f2f23');
    for (let i = 0; i < fw + 18; i += 24) rect(x, fx - 9 + i, fy - 9, 1, fh + 18, '#3d241b');
    rect(x, fx - 8, fy - 8, fw + 16, 2, '#8b5a3c');
    rect(x, fx - 8, fy + fh + 6, fw + 16, 2, '#3d241b');
    // Brass corner studs
    for (const [sx, sy] of [[fx - 6, fy - 6], [fx + fw + 2, fy - 6], [fx - 6, fy + fh + 2], [fx + fw + 2, fy + fh + 2]]) {
      rect(x, sx, sy, 4, 4, '#e6a33c'); rect(x, sx, sy, 2, 2, '#ffcd75');
    }
    // Felt with dithering
    rect(x, fx - 1, fy - 1, fw + 2, fh + 2, K);
    rect(x, fx, fy, fw, fh, '#1e5c3a');
    x.fillStyle = '#23694a';
    for (let yy = 0; yy < fh; yy++) for (let xx = (yy % 2); xx < fw; xx += 2) {
      const d = Math.hypot(xx - fw / 2, (yy - fh / 2) * 2.6);
      if (d < 150) x.fillRect(fx + xx, fy + yy, 1, 1);
    }
    x.fillStyle = '#184d31';
    for (let yy = 0; yy < fh; yy += 1) for (let xx = (yy % 2); xx < fw; xx += 2) {
      const d = Math.hypot(xx - fw / 2, (yy - fh / 2) * 2.6);
      if (d > 230) x.fillRect(fx + xx, fy + yy, 1, 1);
    }
    // Center line with emblem
    const cy = fy + fh / 2;
    for (let xx = fx + 12; xx < fx + fw - 12; xx += 4) rect(x, xx, cy, 2, 1, '#38b764');
    oval(x, 320 - 9, cy - 6, 18, 13, K);
    oval(x, 320 - 8, cy - 5, 16, 11, '#e6a33c');
    oval(x, 320 - 6, cy - 3, 12, 7, '#1e5c3a');
    rect(x, 319, cy - 2, 2, 5, '#ffcd75');
    rect(x, 317, cy, 6, 1, '#ffcd75');
    bgCanvas = c;
    return c;
  }

  // ------------------------------------------------------------ card faces
  const cardCache = new Map();

  function classOf(d) { return CLASS_COL[d.cls] || CLASS_COL.neutral; }

  function nameLines(name, maxW) {
    if (Font.measure(name) <= maxW) return [name];
    const lines = Font.wrap(name, maxW);
    return lines.slice(0, 2);
  }

  // Small hand card: 52x72.
  function smallCard(defId, opts = {}) {
    const d = CARDS[defId];
    const cost = opts.cost != null ? opts.cost : d.cost;
    const key = `s:${defId}:${cost}:${opts.atk}:${opts.hp}`;
    if (cardCache.has(key)) return cardCache.get(key);
    const Wc = 52, Hc = 72;
    const [c, x] = mk(Wc, Hc);
    const [light, mid, dark] = classOf(d);
    box(x, 0, 0, Wc, Hc, mid, K, 2);
    rect(x, 2, 2, Wc - 4, 1, light);
    // portrait window
    if (d.type === 'spell') {
      oval(x, 7, 4, 38, 34, K);
      oval(x, 8, 5, 36, 32, dark);
      oval(x, 10, 7, 32, 28, '#1a1c2c');
    } else if (d.type === 'weapon') {
      oval(x, 8, 4, 36, 34, K);
      oval(x, 9, 5, 34, 32, '#566c86');
      oval(x, 11, 7, 30, 28, '#1a1c2c');
    } else {
      box(x, 6, 4, 40, 34, dark, K, 1);
    }
    x.drawImage(Sprites.get(d.sprite), 10, 5, 32, 32);
    // name banner
    const lines = nameLines(d.name.toUpperCase(), 46);
    const by = 38;
    box(x, 1, by, Wc - 2, lines.length > 1 ? 15 : 9, '#4f2f23', K, 1);
    lines.forEach((ln, i) => text(x, ln, Wc / 2, by + 2 + i * 6, '#f4f4f4', 1, { align: 'center' }));
    // footer
    const fy = lines.length > 1 ? 55 : 49;
    if (d.type === 'spell') text(x, 'SPELL', Wc / 2, fy + 3, light, 1, { align: 'center' });
    else if (d.tribe) text(x, d.tribe.toUpperCase(), Wc / 2, fy + 3, light, 1, { align: 'center' });
    else if (d.type === 'weapon') text(x, 'WEAPON', Wc / 2, fy + 3, light, 1, { align: 'center' });
    // rarity gem
    if (d.rarity !== 'common' && !d.token) { rect(x, Wc / 2 - 2, 38 - 3, 4, 4, K); rect(x, Wc / 2 - 1, 38 - 2, 2, 2, RARITY_COL[d.rarity]); }
    if (d.rarity === 'legendary') {
      // little dragon-wing flourish over the frame
      rect(x, 3, 1, 6, 2, '#ffcd75'); rect(x, Wc - 9, 1, 6, 2, '#ffcd75');
    }
    // cost
    gem(x, 'mana', cost, 7, 7, 1, cost < d.cost ? '#a7f070' : cost > d.cost ? '#ff8fb0' : '#f4f4f4');
    if (d.type === 'minion') {
      const atk = opts.atk != null ? opts.atk : d.atk, hp = opts.hp != null ? opts.hp : d.hp;
      gem(x, 'atk', atk, 7, Hc - 7, 1, atk > d.atk ? '#a7f070' : '#f4f4f4');
      gem(x, 'hp', hp, Wc - 7, Hc - 7, 1, hp > d.hp ? '#a7f070' : hp < d.hp ? '#ff8fb0' : '#f4f4f4');
    } else if (d.type === 'weapon') {
      gem(x, 'atk', d.atk, 7, Hc - 7);
      gem(x, 'dur', d.hp, Wc - 7, Hc - 7);
    }
    cardCache.set(key, c);
    return c;
  }

  // Large detailed card: 104x148.
  function bigCard(defId, opts = {}) {
    const d = CARDS[defId];
    const cost = opts.cost != null ? opts.cost : d.cost;
    const atk = opts.atk != null ? opts.atk : d.atk;
    const hp = opts.hp != null ? opts.hp : d.hp;
    const maxHp = opts.maxHp != null ? opts.maxHp : d.hp;
    const key = `b:${defId}:${cost}:${atk}:${hp}:${maxHp}:${opts.silenced ? 1 : 0}`;
    if (cardCache.has(key)) return cardCache.get(key);
    const Wc = 104, Hc = 148;
    const [c, x] = mk(Wc, Hc);
    const [light, mid, dark] = classOf(d);
    box(x, 0, 0, Wc, Hc, mid, K, 3);
    rect(x, 3, 2, Wc - 6, 1, light);
    rect(x, 2, 3, 1, Hc - 6, light);
    // portrait
    if (d.type === 'spell') {
      oval(x, 18, 6, 68, 58, K); oval(x, 19, 7, 66, 56, light); oval(x, 21, 9, 62, 52, '#1a1c2c');
    } else if (d.type === 'weapon') {
      oval(x, 20, 6, 64, 58, K); oval(x, 21, 7, 62, 56, '#94b0c2'); oval(x, 23, 9, 58, 52, '#1a1c2c');
    } else {
      box(x, 16, 6, 72, 58, K, K, 2);
      box(x, 17, 7, 70, 56, dark, dark, 2);
      // gentle vignette
      for (let yy = 0; yy < 56; yy += 2) rect(x, 18, 8 + yy, 68, 1, 'rgba(0,0,0,0.12)');
    }
    x.drawImage(Sprites.get(d.sprite), 28, 11, 48, 48);
    // name
    box(x, 3, 64, Wc - 6, 11, '#4f2f23', K, 1);
    rect(x, 4, 65, Wc - 8, 1, '#8b5a3c');
    text(x, d.name.toUpperCase(), Wc / 2, 67, '#f4f4f4', 1, { align: 'center' });
    if (d.rarity !== 'common' && !d.token) { box(x, Wc / 2 - 3, 76, 7, 5, RARITY_COL[d.rarity], K, 1); }
    // text panel
    box(x, 7, 80, Wc - 14, 50, '#e8d7b0', K, 2);
    rect(x, 8, 81, Wc - 16, 1, '#fff2d6');
    const body = opts.silenced ? '(Silenced)' : d.text;
    const lines = Font.wrap(body.toUpperCase(), Wc - 22);
    const startY = 80 + Math.max(4, Math.round((50 - lines.length * 7) / 2));
    lines.forEach((ln, i) => text(x, ln, Wc / 2, startY + i * 7, '#333c57', 1, { align: 'center', hi: '#b13e53' }));
    // type line
    const type = d.type === 'minion' ? (d.tribe ? d.tribe.toUpperCase() : 'MINION') : d.type.toUpperCase();
    box(x, Wc / 2 - Font.measure(type) / 2 - 4, Hc - 16, Font.measure(type) + 8, 9, dark, K, 1);
    text(x, type, Wc / 2, Hc - 14, light, 1, { align: 'center' });
    gem(x, 'mana', cost, 11, 11, 2);
    if (d.type === 'minion') {
      gem(x, 'atk', atk, 12, Hc - 12, 2, atk > d.atk ? '#a7f070' : '#f4f4f4');
      gem(x, 'hp', hp, Wc - 12, Hc - 12, 2, hp < maxHp ? '#ff8fb0' : hp > d.hp ? '#a7f070' : '#f4f4f4');
    } else if (d.type === 'weapon') {
      gem(x, 'atk', atk, 12, Hc - 12, 2);
      gem(x, 'dur', hp, Wc - 12, Hc - 12, 2);
    }
    cardCache.set(key, c);
    return c;
  }

  // Keyword tooltips for a card, drawn as a column of boxes.
  function keywordTips(ctx, defId, x, y, maxH = 360) {
    const d = CARDS[defId];
    const found = [];
    const t = d.text.toLowerCase();
    for (const k in KEYWORDS) {
      const [name] = KEYWORDS[k];
      if (t.includes(name.toLowerCase())) found.push(KEYWORDS[k]);
    }
    let yy = y;
    for (const [name, desc] of found) {
      const lines = Font.wrap(desc.toUpperCase(), 84);
      const h = 12 + lines.length * 7;
      if (yy + h > maxH) break;
      box(ctx, x, yy, 92, h, '#1a1c2c', '#566c86', 1);
      text(ctx, name.toUpperCase(), x + 4, yy + 3, '#ffcd75');
      lines.forEach((ln, i) => text(ctx, ln, x + 4, yy + 10 + i * 7, '#f4f4f4'));
      yy += h + 2;
    }
  }

  let backCache = {};
  function cardBack(w, h) {
    const key = w + 'x' + h;
    if (backCache[key]) return backCache[key];
    const [c, x] = mk(w, h);
    box(x, 0, 0, w, h, '#29366f', K, 2);
    rect(x, 2, 2, w - 4, h - 4, '#3b5dc9');
    x.fillStyle = '#29366f';
    for (let yy = 3; yy < h - 3; yy++) for (let xx = 3; xx < w - 3; xx++) if ((xx + yy) % 6 === 0 || (xx - yy + 600) % 6 === 0) x.fillRect(xx, yy, 1, 1);
    const cx = w / 2, cy = h / 2;
    oval(x, cx - 6, cy - 7, 12, 14, K);
    oval(x, cx - 5, cy - 6, 10, 12, '#e6a33c');
    oval(x, cx - 3, cy - 4, 6, 8, '#ffcd75');
    rect(x, 2, 2, w - 4, 1, '#41a6f6');
    return (backCache[key] = c);
  }

  // ------------------------------------------------------------ board pieces
  const MW = 44, MH = 54; // minion token size

  const frameCache = {};
  function minionFrame(rarity, taunt, glow) {
    const key = rarity + taunt + glow;
    if (frameCache[key]) return frameCache[key];
    const pad = 6;
    const [c, x] = mk(MW + pad * 2, MH + pad * 2);
    const ox = pad, oy = pad;
    if (taunt) {
      // stone shield behind
      const sw = MW + 10, sh = MH + 8;
      const sx = ox - 5, sy = oy - 3;
      x.fillStyle = K;
      for (let j = 0; j < sh; j++) {
        const inset = j < sh * 0.55 ? 0 : Math.round(((j - sh * 0.55) / (sh * 0.45)) ** 1.6 * (sw / 2 - 2));
        x.fillRect(sx + inset, sy + j, sw - inset * 2, 1);
      }
      for (let j = 1; j < sh - 1; j++) {
        const inset = j < sh * 0.55 ? 1 : Math.round(((j - sh * 0.55) / (sh * 0.45)) ** 1.6 * (sw / 2 - 2)) + 1;
        x.fillStyle = j < 3 ? '#94b0c2' : '#566c86';
        x.fillRect(sx + inset, sy + j, sw - inset * 2, 1);
      }
    }
    if (glow) ovalRing(x, ox - 2, oy - 2, MW + 4, MH + 4, glow, 2);
    oval(x, ox, oy, MW, MH, K);
    const border = rarity === 'legendary' ? '#e6a33c' : '#94b0c2';
    oval(x, ox + 1, oy + 1, MW - 2, MH - 2, border);
    oval(x, ox + 2, oy + 2, MW - 4, MH - 4, rarity === 'legendary' ? '#ffcd75' : '#566c86');
    oval(x, ox + 3, oy + 3, MW - 6, MH - 6, K);
    oval(x, ox + 4, oy + 4, MW - 8, MH - 8, '#29366f');
    oval(x, ox + 6, oy + 10, MW - 12, MH - 14, '#333c57');
    if (rarity === 'legendary') {
      // golden wings
      for (const s of [-1, 1]) {
        const bx = s < 0 ? ox - 4 : ox + MW;
        rect(x, bx, oy + 10, 4, 3, K); rect(x, bx + (s < 0 ? 0 : 0), oy + 11, 4, 1, '#ffcd75');
        rect(x, bx + (s < 0 ? 1 : -1), oy + 14, 4, 3, K); rect(x, bx + (s < 0 ? 1 : -1), oy + 15, 4, 1, '#e6a33c');
      }
      rect(x, ox + MW / 2 - 3, oy - 3, 6, 4, K);
      rect(x, ox + MW / 2 - 2, oy - 2, 1, 2, '#ffcd75'); rect(x, ox + MW / 2, oy - 2, 1, 2, '#ffcd75'); rect(x, ox + MW / 2 + 2, oy - 2, 1, 2, '#ffcd75');
    }
    frameCache[key] = c;
    return c;
  }

  // Draw a minion token centered at (cx, cy). v = view state (flash, etc.).
  function minion(ctx, g, m, cx, cy, v = {}, t = 0) {
    const d = CARDS[m.defId];
    const x = Math.round(cx - MW / 2), y = Math.round(cy - MH / 2);
    const glow = v.glow || null;
    const frame = minionFrame(d.rarity, m.taunt, glow);
    ctx.drawImage(frame, x - 6, y - 6);
    const sx = x + MW / 2 - 16, sy = y + 7;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x + MW / 2, y + MH / 2, MW / 2 - 4, MH / 2 - 4, 0, 0, Math.PI * 2);
    ctx.clip();
    sprite(ctx, d.sprite, sx, sy + (v.bob || 0), 2);
    if (m.frozen) {
      ctx.fillStyle = 'rgba(115,239,247,0.35)';
      ctx.fillRect(x, y, MW, MH);
      ctx.fillStyle = '#f4f4f4';
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + ((i * 11) % 28), y + 8 + ((i * 17) % 36), 2, 2);
    }
    if (m.stealth) {
      ctx.fillStyle = 'rgba(26,28,44,0.55)';
      for (let yy = 0; yy < MH; yy += 2) for (let xx = (yy / 2 + ((t / 150) | 0)) % 2; xx < MW; xx += 2) ctx.fillRect(x + xx, y + yy, 1, 1);
    }
    if (v.flash > 0) {
      ctx.globalAlpha = Math.min(1, v.flash);
      sprite(ctx, d.sprite, sx, sy, 2, 'w');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (m.divineShield) {
      const a = 0.55 + 0.25 * Math.sin(t / 200);
      ctx.globalAlpha = a;
      ovalRing(ctx, x - 3, y - 3, MW + 6, MH + 6, '#ffcd75', 2);
      ovalRing(ctx, x - 1, y - 1, MW + 2, MH + 2, '#f4f4f4', 1);
      ctx.globalAlpha = 1;
    }
    if (m.frozen) {
      ovalRing(ctx, x + 1, y + 1, MW - 2, MH - 2, '#73eff7', 1);
    }
    // keyword icons along the bottom
    const icons = [];
    if (!m.silenced) {
      if (d.deathrattle) icons.push(['skull', '#f4f4f4']);
      if (d.triggers || d.aura || d.enrage || d.onHeroAttack) icons.push(['bolt', '#ffcd75']);
    }
    if (m.poisonous) icons.push(['drop', '#a7f070']);
    if (m.lifesteal) icons.push(['heart', '#ff8fb0']);
    if (m.windfury) icons.push(['swirl', '#73eff7']);
    if (m.spellDamage) icons.push(['wand', '#b55ac8']);
    const iw = icons.length * 7 - 2;
    icons.forEach(([n, col], i) => mini(ctx, n, Math.round(cx - iw / 2 + i * 7), y + MH - 8, col));
    // stats
    const atk = g.atkOf(m);
    gem(ctx, 'atk', atk, x + 5, y + MH - 6, 1, atk > d.atk ? '#a7f070' : atk < d.atk ? '#ff8fb0' : '#f4f4f4');
    gem(ctx, 'hp', m.hp, x + MW - 5, y + MH - 6, 1, m.hp < m.maxHp ? '#ff8fb0' : m.maxHp > d.hp ? '#a7f070' : '#f4f4f4');
    if (m.silenced) {
      rect(ctx, x + 6, y + MH / 2, MW - 12, 1, 'rgba(181,90,200,0.8)');
    }
  }

  const HW = 54, HH = 54;
  function hero(ctx, g, p, cx, cy, v = {}, t = 0) {
    const hd = HEROES[p.cls];
    const x = Math.round(cx - HW / 2), y = Math.round(cy - HH / 2);
    if (v.glow) box(ctx, x - 3, y - 3, HW + 6, HH + 6, v.glow, v.glow, 3);
    box(ctx, x, y, HW, HH, hd.color, K, 3);
    rect(ctx, x + 3, y + 1, HW - 6, 1, '#f4f4f4');
    box(ctx, x + 2, y + 2, HW - 4, HH - 4, hd.dark, K, 2);
    // portrait backdrop
    for (let yy = 0; yy < 48; yy += 3) rect(ctx, x + 3, y + 3 + yy, 48, 1, 'rgba(255,255,255,0.05)');
    sprite(ctx, hd.sprite, x + 3, y + 3 + (v.bob || 0), 2);
    if (v.flash > 0) { ctx.globalAlpha = Math.min(1, v.flash); sprite(ctx, hd.sprite, x + 3, y + 3, 2, 'w'); ctx.globalAlpha = 1; }
    const h = p.hero;
    if (h.frozen) {
      ctx.fillStyle = 'rgba(115,239,247,0.35)'; ctx.fillRect(x + 3, y + 3, 48, 48);
      outline(ctx, x + 1, y + 1, HW - 2, HH - 2, '#73eff7', 2);
    }
    const hpCol = h.hp < h.maxHp ? '#ffb3c6' : '#f4f4f4';
    gem(ctx, 'hp', Math.max(0, h.hp), x + HW - 4, y + HH - 8, 2, hpCol);
    if (h.armor > 0) gem(ctx, 'armor', h.armor, x + HW - 4, y + HH - 29, 2);
    const atk = g.atkOf(h);
    if (atk > 0 && g.s.current === p.idx) gem(ctx, 'atk', atk, x + 4, y + HH - 8, 2);
  }

  // Round slot (hero power / weapon), 28x28 centered.
  function roundSlot(ctx, cx, cy, fill, edge = K) {
    oval(ctx, cx - 14, cy - 14, 28, 28, edge);
    oval(ctx, cx - 13, cy - 13, 26, 26, fill);
  }

  function heroPower(ctx, g, p, cx, cy, v = {}) {
    const hd = HEROES[p.cls];
    const pw = hd.power;
    const usable = v.usable;
    if (usable) oval(ctx, cx - 16, cy - 16, 32, 32, '#a7f070');
    roundSlot(ctx, cx, cy, p.powerUsed ? '#333c57' : hd.color);
    oval(ctx, cx - 11, cy - 11, 22, 22, p.powerUsed ? '#1a1c2c' : hd.dark);
    if (p.powerUsed) {
      ctx.globalAlpha = 0.35;
      sprite(ctx, pw.icon, cx - 8, cy - 8, 1);
      ctx.globalAlpha = 1;
    } else sprite(ctx, pw.icon, cx - 8, cy - 8, 1);
    if (!p.powerUsed) gem(ctx, 'mana', pw.cost, cx, cy - 15);
  }

  function weapon(ctx, g, p, cx, cy) {
    const w = p.weapon;
    if (!w) return;
    const d = CARDS[w.defId];
    const inactive = g.s.current !== p.idx;
    roundSlot(ctx, cx, cy, inactive ? '#333c57' : '#94b0c2');
    oval(ctx, cx - 11, cy - 11, 22, 22, '#1a1c2c');
    if (inactive) ctx.globalAlpha = 0.6;
    sprite(ctx, d.sprite, cx - 8, cy - 8, 1);
    ctx.globalAlpha = 1;
    gem(ctx, 'atk', w.atk, cx - 11, cy + 10);
    gem(ctx, 'dur', w.dur, cx + 11, cy + 10);
  }

  function manaBar(ctx, p, x, y, alignRight) {
    const label = `${p.mana}/${p.maxMana}`;
    const gw = 7;
    const total = 10 * gw;
    const sx = alignRight ? x - total : x;
    for (let i = 0; i < 10; i++) {
      const gx = sx + i * gw, gy = y;
      let col = null;
      if (i < p.mana) col = ['#73eff7', '#41a6f6', '#3b5dc9'];
      else if (i < p.maxMana) col = ['#566c86', '#333c57', '#29366f'];
      if (col) {
        rect(ctx, gx + 1, gy, 4, 1, K); rect(ctx, gx, gy + 1, 6, 6, K); rect(ctx, gx + 1, gy + 7, 4, 1, K);
        rect(ctx, gx + 1, gy + 1, 4, 6, col[1]); rect(ctx, gx + 1, gy + 1, 2, 2, col[0]); rect(ctx, gx + 3, gy + 5, 2, 2, col[2]);
      } else {
        rect(ctx, gx + 2, gy + 3, 2, 2, '#333c57');
      }
    }
    text(ctx, label, alignRight ? sx - 4 : sx + total + 3, y + 1, '#73eff7', 1, { align: alignRight ? 'right' : 'left', outline: K });
  }

  function button(ctx, x, y, w, h, label, state = {}) {
    const base = state.disabled ? '#566c86' : state.color || '#e6a33c';
    const hi = state.disabled ? '#94b0c2' : state.hi || '#ffcd75';
    const lo = state.disabled ? '#333c57' : state.lo || '#8b5a3c';
    const push = state.down ? 1 : 0;
    box(ctx, x, y + 2, w, h, K, K, 2);
    box(ctx, x, y + push, w, h, state.hover && !state.disabled ? hi : base, K, 2);
    rect(ctx, x + 2, y + push + 1, w - 4, 1, hi);
    rect(ctx, x + 2, y + push + h - 2, w - 4, 1, lo);
    text(ctx, label, x + w / 2, y + push + Math.round(h / 2 - 2.5 * (state.scale || 1)), state.textColor || '#1a1c2c', state.scale || 1, { align: 'center' });
  }

  function panel(ctx, x, y, w, h, fill = '#1a1c2c', edge = '#566c86') {
    box(ctx, x, y, w, h, K, K, 2);
    box(ctx, x + 1, y + 1, w - 2, h - 2, fill, edge, 2);
  }

  // Pixel arrow made of dashes with a head.
  function arrow(ctx, x0, y0, x1, y1, col, t) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 8) return;
    const mx = (x0 + x1) / 2 - dy * 0.15, my = (y0 + y1) / 2 + dx * 0.15 - 10;
    const pts = [];
    const step = 7;
    const n = Math.max(2, Math.floor(len / step));
    const off = (t / 40) % step / step;
    for (let i = 0; i < n; i++) {
      const u = (i + off) / n;
      if (u > 0.92) break;
      const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
      const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
      pts.push([px, py, u]);
    }
    for (const [px, py, u] of pts) {
      const s = 3 + Math.round(u * 2);
      rect(ctx, px - s / 2 - 1, py - s / 2 - 1, s + 2, s + 2, K);
      rect(ctx, px - s / 2, py - s / 2, s, s, col);
    }
    // head
    const u = 0.9;
    const hx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
    const hy = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
    const ang = Math.atan2(y1 - hy, x1 - hx);
    ctx.save();
    ctx.translate(Math.round(x1), Math.round(y1));
    const size = 9;
    for (let r = 0; r < size; r++) {
      const half = Math.round(r * 0.75);
      for (let s = -half; s <= half; s++) {
        const px = Math.round(-r * Math.cos(ang) - s * Math.sin(ang));
        const py = Math.round(-r * Math.sin(ang) + s * Math.cos(ang));
        ctx.fillStyle = (Math.abs(s) === half || r === size - 1) ? K : col;
        ctx.fillRect(px, py, 1, 1);
        ctx.fillRect(px + 1, py, 1, 1);
      }
    }
    ctx.restore();
  }

  function reticle(ctx, cx, cy, r, col, t) {
    const s = r + Math.round(Math.sin(t / 120) * 1.5);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + sx * s, y = cy + sy * s;
      rect(ctx, x - (sx > 0 ? 6 : 0) - 1, y - 1, 7 + 1, 3, K);
      rect(ctx, x - 1, y - (sy > 0 ? 6 : 0) - 1, 3, 7 + 1, K);
      rect(ctx, x - (sx > 0 ? 6 : 0), y, 7, 1, col);
      rect(ctx, x, y - (sy > 0 ? 6 : 0), 1, 7, col);
    }
  }

  root.R = {
    W, H, CLASS_COL, RARITY_COL, MW, MH, HW, HH,
    mk, rect, box, outline, zzz, oval, ovalRing, sprite, text, gem, mini, background, smallCard, bigCard, keywordTips,
    cardBack, minion, hero, heroPower, weapon, manaBar, button, panel, arrow, reticle, roundSlot,
  };
})(window);
