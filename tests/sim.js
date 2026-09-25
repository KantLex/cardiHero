// Headless AI-vs-AI games to smoke-test the rules engine and AI.
// Usage: node tests/sim.js [games]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

for (const f of ['cards.js', 'engine.js', 'ai.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });
}

const classes = Object.keys(HEROES);
const N = +process.argv[2] || 40;

function check(g) {
  for (const p of g.s.players) {
    if (p.board.length > RULES.MAX_BOARD) throw new Error('board overflow');
    if (p.hand.length > RULES.MAX_HAND) throw new Error('hand overflow');
    if (p.mana < 0) throw new Error('negative mana');
    for (const m of p.board) {
      if (m.hp <= 0) throw new Error('dead minion left on board: ' + m.defId);
      if (!CARDS[m.defId]) throw new Error('unknown def ' + m.defId);
    }
  }
}

async function playGame(seed, c0, c1) {
  const g = Game.create({ classes: [c0, c1], seed, first: seed % 2, ai: [true, true] });
  const ais = [new AI('normal'), new AI('normal')];
  for (const p of g.s.players) await g.mulligan(p, ais[p.idx].chooseMulligan(g, p));
  await g.begin();
  let actions = 0;
  while (!g.s.over && g.s.turn < 120) {
    const me = g.s.current;
    for (let k = 0; k < 40 && !g.s.over; k++) {
      const a = await ais[me].bestAction(g, me);
      if (!a) break;
      const ok = await g.apply(g.P(me), a);
      if (!ok) throw new Error('AI chose illegal action ' + JSON.stringify(a));
      actions++;
      check(g);
    }
    await g.endTurn();
    check(g);
  }
  return { winner: g.s.winner, turns: g.s.turn, actions };
}

(async () => {
  const wins = {}; const games = {};
  let totalTurns = 0, errors = 0;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const c0 = classes[i % classes.length], c1 = classes[Math.floor(i / classes.length) % classes.length];
    try {
      const r = await playGame(1000 + i, c0, c1);
      totalTurns += r.turns;
      games[c0] = (games[c0] || 0) + 1; games[c1] = (games[c1] || 0) + 1;
      if (r.winner >= 0) { const w = r.winner === 0 ? c0 : c1; wins[w] = (wins[w] || 0) + 1; }
    } catch (e) {
      errors++;
      console.error(`game ${i} (${c0} vs ${c1}) failed:`, e.stack);
    }
  }
  const ms = Date.now() - t0;
  console.log(`games=${N} errors=${errors} avgTurns=${(totalTurns / N).toFixed(1)} ms/game=${(ms / N).toFixed(0)}`);
  for (const c of classes) console.log(`  ${c.padEnd(8)} winrate ${(((wins[c] || 0) / (games[c] || 1)) * 100).toFixed(0)}%`);
  process.exit(errors ? 1 : 0);
})();
