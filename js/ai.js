// Greedy one-ply AI: simulate every legal action on a cloned game, keep the best one, repeat.
(function (root) {
  function heroValue(eff) {
    // Health matters more the lower it gets.
    let v = 0;
    v += Math.min(eff, 12) * 1.4;
    v += Math.max(0, Math.min(eff, 20) - 12) * 0.8;
    v += Math.max(0, eff - 20) * 0.4;
    return v;
  }

  function minionValue(g, m) {
    const a = g.atkOf(m);
    let v = 0.5 + a + m.hp;
    if (m.taunt) v += 1.5;
    if (m.divineShield) v += a * 0.7 + 1;
    if (m.windfury) v += a * 0.6;
    if (m.poisonous) v += 3;
    if (m.lifesteal) v += a * 0.5;
    if (m.stealth) v += 1;
    if (m.spellDamage) v += 1;
    if (!m.silenced) {
      const d = g.def(m);
      if (d.deathrattle) v += 1.5;
      if (d.aura || d.triggers || d.enrage) v += 1.5;
    }
    if (m.frozen) v -= a * 0.4;
    return v;
  }

  function evaluate(g, me) {
    const s = g.s;
    if (s.over) return s.winner === me ? 1e6 : s.winner === -1 ? -5e5 : -1e6;
    const P = g.P(me), O = g.opp(P);
    let v = heroValue(P.hero.hp + P.hero.armor) - heroValue(O.hero.hp + O.hero.armor);
    let myAtk = 0, opAtk = 0;
    for (const m of P.board) { v += minionValue(g, m); myAtk += g.atkOf(m); }
    for (const m of O.board) { v -= minionValue(g, m) * 1.15; if (!m.frozen) opAtk += g.atkOf(m) * (m.windfury ? 2 : 1); }
    for (const c of P.hand) v += 1 + g.def(c).cost * 0.25;
    if (P.weapon) v += P.weapon.atk * P.weapon.dur * 0.6;
    if (O.weapon) { v -= O.weapon.atk * O.weapon.dur * 0.6; opAtk += O.weapon.atk; }
    // Danger: can the opponent kill us next turn with what's on board?
    const myEff = P.hero.hp + P.hero.armor;
    if (opAtk >= myEff) v -= 60;
    v -= opAtk * 0.3;
    v += myAtk * 0.15;
    return v;
  }

  class AI {
    constructor(level = 'normal') { this.level = level; }

    chooseMulligan(g, p) {
      return p.hand.filter((c) => g.def(c).cost > 3).map((c) => c.uid);
    }

    // Returns the best action for player idx `me`, or null to end the turn.
    async bestAction(g, me) {
      const p = g.P(me);
      const acts = g.legalActions(p);
      if (!acts.length) return null;
      const base = evaluate(g, me);
      let best = null, bestScore = base + 0.25;
      const noise = this.level === 'easy' ? 4 : 0;
      for (const a of acts) {
        const sim = g.clone();
        sim.s.rng = (Math.random() * 4294967296) >>> 0;
        const ok = await sim.apply(sim.P(me), a);
        if (!ok) continue;
        let score = evaluate(sim, me);
        if (a.type === 'play') score += sim.def(g.handCard(p, a.uid)).cost * 0.08;
        if (noise) score += (Math.random() - 0.5) * noise;
        if (score > bestScore) { bestScore = score; best = a; }
      }
      if (best && best.type === 'play') {
        const d = g.def(g.handCard(p, best.uid));
        if (d.type === 'minion') best.pos = this.placement(g, p);
      }
      return best;
    }

    placement(g, p) {
      return Math.floor(p.board.length / 2 + 0.5);
    }
  }

  root.AI = AI;
  root.evaluateBoard = evaluate;
})(typeof window !== 'undefined' ? window : globalThis);
