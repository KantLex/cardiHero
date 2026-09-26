// Tiny procedural chiptune sound effects via WebAudio.
(function (root) {
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem('cardihero.muted') === '1'; } catch (e) { /* storage unavailable */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, { type = 'square', vol = 1, slide = 0, delay = 0 } = {}) {
    const c = ensure();
    if (!c || muted) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur, { vol = 1, delay = 0, filter = 1200 } = {}) {
    const c = ensure();
    if (!c || muted) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filter;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const SFX = {
    click: () => tone(660, 0.05, { vol: 0.5 }),
    hover: () => tone(880, 0.02, { vol: 0.15 }),
    draw: () => { tone(520, 0.05, { vol: 0.3 }); tone(780, 0.05, { vol: 0.3, delay: 0.04 }); },
    play: () => { noise(0.12, { vol: 0.5, filter: 800 }); tone(220, 0.1, { slide: 0.5, vol: 0.6 }); },
    summon: () => { tone(330, 0.08, { vol: 0.5 }); tone(495, 0.1, { vol: 0.5, delay: 0.06 }); },
    attack: () => { noise(0.08, { vol: 0.6, filter: 3000 }); tone(300, 0.08, { slide: 2, vol: 0.4 }); },
    hit: () => { noise(0.15, { vol: 0.9, filter: 1500 }); tone(140, 0.12, { slide: 0.5, vol: 0.8 }); },
    heal: () => { tone(660, 0.08, { type: 'triangle', vol: 0.6 }); tone(880, 0.12, { type: 'triangle', vol: 0.6, delay: 0.07 }); },
    shield: () => { tone(1200, 0.15, { type: 'triangle', slide: 0.6, vol: 0.6 }); },
    freeze: () => { tone(1500, 0.2, { type: 'sine', slide: 0.5, vol: 0.5 }); noise(0.2, { vol: 0.3, filter: 6000 }); },
    buff: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.08, { vol: 0.4, delay: i * 0.05 })); },
    death: () => { tone(400, 0.3, { slide: 0.2, vol: 0.6 }); noise(0.25, { vol: 0.5, filter: 900 }); },
    fire: () => { noise(0.35, { vol: 0.7, filter: 1800 }); tone(180, 0.3, { slide: 0.4, type: 'sawtooth', vol: 0.3 }); },
    zap: () => { tone(900, 0.12, { slide: 0.3, vol: 0.5 }); },
    armor: () => { tone(200, 0.06, { vol: 0.6 }); tone(400, 0.12, { vol: 0.5, delay: 0.05, type: 'triangle' }); },
    coin: () => { tone(988, 0.06, { vol: 0.5 }); tone(1319, 0.2, { vol: 0.5, delay: 0.06 }); },
    turn: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.1, { vol: 0.45, delay: i * 0.07 })); },
    enemyTurn: () => { [330, 262].forEach((f, i) => tone(f, 0.12, { vol: 0.4, delay: i * 0.09 })); },
    error: () => { tone(150, 0.12, { vol: 0.5 }); tone(120, 0.15, { vol: 0.5, delay: 0.08 }); },
    win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, { vol: 0.5, delay: i * 0.12 })); },
    lose: () => { [392, 370, 349, 262].forEach((f, i) => tone(f, 0.25, { vol: 0.5, delay: i * 0.2, type: 'triangle' })); },
    burn: () => { noise(0.4, { vol: 0.6, filter: 2500 }); },
  };

  function play(name) {
    try { if (SFX[name]) SFX[name](); } catch (e) { /* ignore audio failures */ }
  }

  root.Sound = {
    play,
    unlock: () => { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    toggle: () => {
      muted = !muted;
      try { localStorage.setItem('cardihero.muted', muted ? '1' : '0'); } catch (e) { /* storage unavailable */ }
      return muted;
    },
    get muted() { return muted; },
  };
})(window);
