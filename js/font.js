// Tiny variable-width 5px-tall bitmap font. Everything is uppercase.
(function (root) {
  const G = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'],
    F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##.', '#...', '#.##', '#..#', '.##.'],
    H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'],
    J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
    L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
    N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
    O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
    P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.##.', '#..#', '#..#', '#.#.', '.#.#'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'],
    T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'],
    V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
    X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'],
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'],
    3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'],
    5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'],
    7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'],
    9: ['###', '#.#', '###', '..#', '##.'],
    ' ': ['..', '..', '..', '..', '..'],
    '.': ['.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '.#', '#.'],
    '!': ['#', '#', '#', '.', '#'],
    '?': ['##.', '..#', '.#.', '...', '.#.'],
    ':': ['.', '#', '.', '#', '.'],
    ';': ['..', '.#', '..', '.#', '#.'],
    "'": ['#', '#', '.', '.', '.'],
    '"': ['#.#', '#.#', '...', '...', '...'],
    '-': ['...', '...', '###', '...', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    '(': ['.#', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '#.'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'],
    '*': ['...', '#.#', '.#.', '#.#', '...'],
    '>': ['#..', '.#.', '..#', '.#.', '#..'],
    '<': ['..#', '.#.', '#..', '.#.', '..#'],
    '=': ['...', '###', '...', '###', '...'],
    '#': ['#.#', '###', '#.#', '###', '#.#'],
    '_': ['...', '...', '...', '...', '###'],
    '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  };

  // Pre-parse glyphs into pixel lists.
  const glyphs = {};
  for (const ch in G) {
    const rows = G[ch];
    const px = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < rows[y].length; x++) if (rows[y][x] === '#') px.push(x, y);
    glyphs[ch] = { w: rows[0].length, px };
  }

  function glyph(ch) {
    return glyphs[ch] || glyphs[ch.toUpperCase()] || glyphs['?'];
  }

  function measure(text, scale = 1) {
    let w = 0;
    for (const ch of String(text)) {
      if (ch === '~') continue; // colour toggle marker
      w += glyph(ch).w + 1;
    }
    return Math.max(0, w - 1) * scale;
  }

  // Draw text. `~` toggles to the highlight colour (used for keywords).
  function draw(ctx, text, x, y, color = '#f4f4f4', scale = 1, opts = {}) {
    x = Math.round(x); y = Math.round(y);
    if (opts.align === 'center') x = Math.round(x - measure(text, scale) / 2);
    else if (opts.align === 'right') x = Math.round(x - measure(text, scale));
    if (opts.outline) {
      const o = opts.outline;
      const s = opts.outlineW || scale;
      for (const [dx, dy] of [[-s, 0], [s, 0], [0, -s], [0, s], [-s, -s], [s, -s], [-s, s], [s, s]]) {
        raw(ctx, text, x + dx, y + dy, o, o, scale);
      }
    } else if (opts.shadow) {
      raw(ctx, text, x, y + scale, opts.shadow, opts.shadow, scale);
    }
    raw(ctx, text, x, y, color, opts.hi || '#ffcd75', scale);
  }

  function raw(ctx, text, x, y, color, hi, scale) {
    let cx = x;
    let useHi = false;
    ctx.fillStyle = color;
    for (const ch of String(text)) {
      if (ch === '~') { useHi = !useHi; ctx.fillStyle = useHi ? hi : color; continue; }
      const g = glyph(ch);
      const p = g.px;
      for (let i = 0; i < p.length; i += 2) ctx.fillRect(cx + p[i] * scale, y + p[i + 1] * scale, scale, scale);
      cx += (g.w + 1) * scale;
    }
  }

  // Word-wrap into lines that fit `maxW` pixels. Keeps `~` markers balanced per line.
  function wrap(text, maxW, scale = 1) {
    const out = [];
    for (const para of String(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      let hiOpen = false;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (measure(test, scale) > maxW && line) {
          out.push(hiOpen ? line + '~' : line);
          line = (hiOpen ? '~' : '') + w;
        } else line = test;
        for (const ch of w) if (ch === '~') hiOpen = !hiOpen;
      }
      out.push(line);
    }
    return out;
  }

  root.Font = { draw, measure, wrap, H: 5 };
})(typeof window !== 'undefined' ? window : globalThis);
