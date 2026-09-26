// Game rules. State is plain JSON (so the AI can clone it); card behaviour lives in CARDS.
// Every action is async so the UI can await animations through `fx`. Headless games use NullFx.
(function (root) {
  const MAX_BOARD = 7;
  const MAX_HAND = 10;
  const MAX_MANA = 10;

  const noop = () => {};
  const NullFx = new Proxy({}, { get: () => noop });

  const TARGETS = {
    any: () => true,
    minion: (g, p, e) => e.kind === 'minion',
    enemyMinion: (g, p, e) => e.kind === 'minion' && e.owner !== p.idx,
    friendlyMinion: (g, p, e) => e.kind === 'minion' && e.owner === p.idx,
    enemy: (g, p, e) => e.owner !== p.idx,
    friendly: (g, p, e) => e.owner === p.idx,
    damagedEnemyMinion: (g, p, e) => e.kind === 'minion' && e.owner !== p.idx && e.hp < e.maxHp,
    friendlyBeast: (g, p, e) => e.kind === 'minion' && e.owner === p.idx && g.tribeOf(e) === 'Beast',
  };

  function mulberry(a) {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return [a, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
  }

  class Game {
    constructor(state, fx) {
      this.s = state;
      this.fx = fx || NullFx;
    }

    static create({ classes, seed, first, ai }) {
      const s = {
        turn: 0, current: first, uid: 1, rng: seed >>> 0, over: false, winner: null, phase: 'mulligan',
        history: [], players: [],
      };
      const g = new Game(s);
      for (let i = 0; i < 2; i++) {
        const cls = classes[i];
        const p = {
          idx: i, cls, isAI: !!(ai && ai[i]),
          hero: { uid: s.uid++, kind: 'hero', owner: i, hp: 30, maxHp: 30, armor: 0, atk: 0, attacks: 0, frozen: false, frozenTurn: 0 },
          weapon: null, deck: g.shuffleCopy(root.DECKS[cls]), hand: [], board: [],
          maxMana: 0, mana: 0, fatigue: 0, powerUsed: false, mulligan: null,
        };
        s.players.push(p);
      }
      // Opening hands: 3 for the first player, 4 for the second.
      for (const p of s.players) {
        const n = p.idx === first ? 3 : 4;
        for (let k = 0; k < n; k++) p.hand.push(g.makeCard(p.deck.pop()));
      }
      return g;
    }

    // ---------------------------------------------------------------- utils
    rand() { const [a, r] = mulberry(this.s.rng); this.s.rng = a >>> 0; return r; }
    randInt(n) { return Math.floor(this.rand() * n); }
    pick(arr) { return arr.length ? arr[this.randInt(arr.length)] : null; }
    shuffleCopy(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = this.randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    makeCard(defId) { return { uid: this.s.uid++, defId }; }
    def(x) { return root.CARDS[typeof x === 'string' ? x : x.defId]; }
    clone() { return new Game(JSON.parse(JSON.stringify(this.s))); }

    P(i) { return this.s.players[i]; }
    get cur() { return this.s.players[this.s.current]; }
    opp(p) { return this.s.players[1 - p.idx]; }
    tribeOf(m) { return this.def(m).tribe; }
    heroDef(p) { return root.HEROES[p.cls]; }

    allMinions() {
      const a = this.cur, b = this.opp(a);
      return a.board.concat(b.board);
    }
    allChars() {
      const a = this.cur, b = this.opp(a);
      return [a.hero, ...a.board, b.hero, ...b.board];
    }
    enemyChars(p) { const o = this.opp(p); return [o.hero, ...o.board]; }
    ent(uid) {
      for (const p of this.s.players) {
        if (p.hero.uid === uid) return p.hero;
        for (const m of p.board) if (m.uid === uid) return m;
      }
      return null;
    }
    handCard(p, uid) { return p.hand.find((c) => c.uid === uid) || null; }

    // ---------------------------------------------------------------- stats
    atkOf(e) {
      if (e.kind === 'hero') {
        const p = this.P(e.owner);
        return e.atk + (p.weapon ? p.weapon.atk : 0);
      }
      let a = e.atk;
      if (!e.silenced) {
        const d = this.def(e);
        if (d.enrage && e.hp < e.maxHp) a += d.enrage;
      }
      for (const src of this.P(e.owner).board) {
        if (src === e || src.silenced) continue;
        const aura = this.def(src).aura;
        if (aura && aura.filter(this, e)) a += aura.atk;
      }
      return Math.max(0, a);
    }
    spellDmg(p, n) {
      let bonus = 0;
      for (const m of p.board) if (!m.silenced && m.spellDamage) bonus += m.spellDamage;
      return n + bonus;
    }
    maxAttacks(e) {
      if (e.kind === 'minion' && e.windfury) return 2;
      return 1;
    }
    canAttack(e) {
      if (this.s.over || e.owner !== this.s.current || e.frozen || e.hp <= 0) return false;
      if (this.atkOf(e) <= 0) return false;
      if (e.attacks >= this.maxAttacks(e)) return false;
      if (e.kind === 'minion' && e.sick && !e.charge && !e.rush) return false;
      return this.attackTargets(e).length > 0;
    }
    attackTargets(e) {
      const o = this.opp(this.P(e.owner));
      const visible = o.board.filter((m) => !m.stealth && m.hp > 0);
      const taunts = visible.filter((m) => m.taunt);
      let list = taunts.length ? taunts : [o.hero, ...visible];
      if (e.kind === 'minion' && e.sick && e.rush && !e.charge) list = list.filter((t) => t.kind === 'minion');
      return list;
    }

    // ---------------------------------------------------------------- targeting
    validTargets(spec, p) {
      if (!spec) return [];
      const fn = TARGETS[spec];
      return this.allChars().filter((e) => e.hp > 0 && !e.destroyed && fn(this, p, e) && !(e.stealth && e.owner !== p.idx));
    }
    cardCost(p, c) { return this.def(c).cost; }
    canPlay(p, c) {
      if (this.s.over || p.idx !== this.s.current || this.s.phase !== 'play') return false;
      const d = this.def(c);
      if (this.cardCost(p, c) > p.mana) return false;
      if (d.type === 'minion' && p.board.length >= MAX_BOARD) return false;
      if (d.requires && !d.requires(this, p)) return false;
      if (d.type === 'spell' && d.target && this.validTargets(d.target, p).length === 0) return false;
      return true;
    }
    // Does playing this card need the player to pick a target right now?
    needsTarget(p, c) {
      const d = this.def(c);
      if (!d.target) return false;
      return this.validTargets(d.target, p).length > 0;
    }
    canUsePower(p) {
      if (this.s.over || p.idx !== this.s.current || this.s.phase !== 'play') return false;
      const hp = this.heroDef(p).power;
      if (p.powerUsed || p.mana < hp.cost) return false;
      if (hp.requires && !hp.requires(this, p)) return false;
      if (hp.target && this.validTargets(hp.target, p).length === 0) return false;
      return true;
    }

    // ---------------------------------------------------------------- flow
    async mulligan(p, uids) {
      const back = p.hand.filter((c) => uids.includes(c.uid));
      p.hand = p.hand.filter((c) => !uids.includes(c.uid));
      for (const c of back) p.deck.push(c.defId);
      p.deck = this.shuffleCopy(p.deck);
      for (let i = 0; i < back.length; i++) p.hand.push(this.makeCard(p.deck.pop()));
      p.mulligan = true;
    }

    async begin() {
      const second = this.P(1 - this.s.current);
      second.hand.push(this.makeCard('coin'));
      this.s.phase = 'play';
      await this.startTurn();
    }

    async startTurn() {
      const p = this.cur;
      this.s.turn++;
      p.maxMana = Math.min(MAX_MANA, p.maxMana + 1);
      p.mana = p.maxMana;
      p.powerUsed = false;
      p.hero.attacks = 0;
      for (const m of p.board) { m.attacks = 0; m.sick = false; }
      await this.fx.turnStart(p);
      await this.draw(p, 1);
      await this.fireAll('turnStart', p);
      await this.resolveDeaths();
    }

    async endTurn() {
      if (this.s.over) return;
      const p = this.cur;
      await this.fireAll('turnEnd', p);
      await this.resolveDeaths();
      if (this.s.over) return;
      for (const e of [p.hero, ...p.board]) if (e.frozen && e.frozenTurn < this.s.turn) e.frozen = false;
      p.hero.atk = 0;
      this.s.current = 1 - this.s.current;
      await this.startTurn();
    }

    // Fire a trigger on every minion of `p` that owns it.
    async fireAll(name, p, arg) {
      for (const m of p.board.slice()) {
        if (m.silenced || m.hp <= 0) continue;
        const t = this.def(m).triggers;
        if (t && t[name]) await t[name](this, m, arg);
      }
    }

    // ---------------------------------------------------------------- actions
    async playCard(p, uid, opts = {}) {
      const c = this.handCard(p, uid);
      if (!c || !this.canPlay(p, c)) return false;
      const d = this.def(c);
      let target = opts.target != null ? this.ent(opts.target) : null;
      if (this.needsTarget(p, c)) {
        const ok = target && this.validTargets(d.target, p).includes(target);
        if (!ok) return false;
      } else target = null;

      p.mana -= this.cardCost(p, c);
      p.hand = p.hand.filter((h) => h !== c);
      this.s.history.push({ player: p.idx, defId: d.id, target: target ? target.uid : null, turn: this.s.turn });
      await this.fx.cardPlayed(p, c, target, opts.pos);

      if (d.type === 'minion') {
        const pos = opts.pos == null ? p.board.length : Math.max(0, Math.min(p.board.length, opts.pos));
        const m = await this.summon(p, d.id, pos, c.uid);
        if (m && d.battlecry) {
          await d.battlecry(this, { self: m, player: p, target });
        }
      } else if (d.type === 'spell') {
        await this.fireAll('friendlySpell', p);
        await d.cast(this, { player: p, target, card: c });
      } else if (d.type === 'weapon') {
        await this.equip(p, d.id);
      }
      await this.resolveDeaths();
      return true;
    }

    async usePower(p, targetUid) {
      if (!this.canUsePower(p)) return false;
      const hp = this.heroDef(p).power;
      let target = null;
      if (hp.target) {
        target = this.ent(targetUid);
        if (!target || !this.validTargets(hp.target, p).includes(target)) return false;
      }
      p.mana -= hp.cost;
      p.powerUsed = true;
      await this.fx.heroPower(p);
      await hp.use(this, { player: p, target });
      await this.resolveDeaths();
      return true;
    }

    async attack(attUid, tgtUid) {
      const a = this.ent(attUid), t = this.ent(tgtUid);
      if (!a || !t || !this.canAttack(a) || !this.attackTargets(a).includes(t)) return false;
      const p = this.P(a.owner);
      a.attacks++;
      if (a.stealth) a.stealth = false;
      const dmgA = this.atkOf(a);
      const dmgT = t.kind === 'minion' ? this.atkOf(t) : 0;
      if (a.kind === 'hero' && p.weapon) {
        const wd = this.def(p.weapon.defId);
        if (wd.onHeroAttack) await wd.onHeroAttack(this, p);
      }
      await this.fx.attack(a, t);
      await Promise.all([
        this.damage(t, dmgA, a),
        dmgT > 0 ? this.damage(a, dmgT, t) : null,
      ]);
      if (a.kind === 'hero' && p.weapon) {
        p.weapon.dur -= 1;
        if (p.weapon.dur <= 0) { await this.fx.weaponBreak(p); p.weapon = null; }
      }
      await this.fx.wait(120);
      await this.resolveDeaths();
      return true;
    }

    // ---------------------------------------------------------------- primitives
    async summon(p, defId, pos, uid) {
      if (p.board.length >= MAX_BOARD) return null;
      const d = this.def(defId);
      const m = {
        uid: uid || this.s.uid++, kind: 'minion', owner: p.idx, defId,
        atk: d.atk, hp: d.hp, maxHp: d.hp, attacks: 0, sick: true, frozen: false, frozenTurn: 0,
        taunt: !!d.kw.taunt, charge: !!d.kw.charge, rush: !!d.kw.rush, divineShield: !!d.kw.divineShield,
        windfury: !!d.kw.windfury, stealth: !!d.kw.stealth, poisonous: !!d.kw.poisonous,
        lifesteal: !!d.kw.lifesteal, spellDamage: d.kw.spellDamage || 0, silenced: false,
      };
      if (pos == null || pos > p.board.length) pos = p.board.length;
      p.board.splice(Math.max(0, pos), 0, m);
      await this.fx.summon(m);
      return m;
    }

    async damage(t, n, src, opts = {}) {
      if (!t || n <= 0) return 0;
      if (t.kind === 'minion' && t.divineShield) {
        t.divineShield = false;
        await this.fx.shieldPop(t);
        return 0;
      }
      let dealt = n;
      if (t.kind === 'hero' && t.armor > 0) {
        const absorbed = Math.min(t.armor, n);
        t.armor -= absorbed;
        n -= absorbed;
      }
      t.hp -= n;
      await this.fx.damage(t, dealt, opts);
      if (src && src.kind === 'minion') {
        if (src.poisonous && !src.silenced && t.kind === 'minion') t.destroyed = true;
        if (src.lifesteal && !src.silenced) await this.heal(this.P(src.owner).hero, dealt, null);
        if (!src.silenced) {
          const tr = this.def(src).triggers;
          if (tr && tr.dealtDamage) await tr.dealtDamage(this, src, t);
        }
      }
      if (t.kind === 'minion') await this.fireAll('friendlyDamaged', this.P(t.owner), t);
      return dealt;
    }

    async heal(t, n) {
      if (!t || t.hp <= 0) return 0;
      const amt = Math.min(n, t.maxHp - t.hp);
      if (amt <= 0) return 0;
      t.hp += amt;
      await this.fx.heal(t, amt);
      return amt;
    }

    async freeze(t) {
      if (!t || t.hp <= 0) return;
      t.frozen = true;
      t.frozenTurn = this.s.turn;
      await this.fx.freeze(t);
    }

    async destroy(t) { t.destroyed = true; }

    async buff(t, atk, hp) {
      t.atk += atk;
      t.maxHp += hp;
      t.hp += hp;
      await this.fx.buff(t);
    }

    async silence(m) {
      const d = this.def(m);
      Object.assign(m, {
        taunt: false, charge: false, rush: false, divineShield: false, windfury: false, stealth: false,
        poisonous: false, lifesteal: false, spellDamage: 0, silenced: true, frozen: false,
      });
      m.atk = d.atk;
      m.maxHp = d.hp;
      m.hp = Math.min(m.hp, m.maxHp);
      await this.fx.silence(m);
    }

    async transform(m, defId) {
      const p = this.P(m.owner);
      const i = p.board.indexOf(m);
      if (i < 0) return;
      const d = this.def(defId);
      const fresh = {
        uid: m.uid, kind: 'minion', owner: m.owner, defId, atk: d.atk, hp: d.hp, maxHp: d.hp, attacks: 0,
        sick: true, frozen: false, frozenTurn: 0, taunt: !!d.kw.taunt, charge: !!d.kw.charge, rush: !!d.kw.rush,
        divineShield: !!d.kw.divineShield, windfury: !!d.kw.windfury, stealth: !!d.kw.stealth,
        poisonous: !!d.kw.poisonous, lifesteal: !!d.kw.lifesteal, spellDamage: d.kw.spellDamage || 0, silenced: false,
      };
      p.board[i] = fresh;
      await this.fx.transform(fresh);
    }

    async gainArmor(p, n) {
      p.hero.armor += n;
      await this.fx.armor(p, n);
    }

    async equip(p, defId) {
      const d = this.def(defId);
      if (p.weapon) await this.fx.weaponBreak(p);
      p.weapon = { defId, atk: d.atk, dur: d.hp };
      await this.fx.equip(p);
    }

    async draw(p, n = 1) {
      for (let i = 0; i < n; i++) {
        if (this.s.over) return;
        if (!p.deck.length) {
          p.fatigue++;
          await this.fx.fatigue(p, p.fatigue);
          await this.damage(p.hero, p.fatigue, null);
          continue;
        }
        const defId = p.deck.pop();
        if (p.hand.length >= MAX_HAND) { await this.fx.burn(p, defId); continue; }
        const c = this.makeCard(defId);
        p.hand.push(c);
        await this.fx.draw(p, c);
      }
      this.checkEnd();
    }

    async resolveDeaths() {
      for (let guard = 0; guard < 20; guard++) {
        const dead = [];
        for (const p of [this.cur, this.opp(this.cur)]) {
          for (let i = 0; i < p.board.length; i++) {
            const m = p.board[i];
            if (m.hp <= 0 || m.destroyed) dead.push({ m, p, pos: i });
          }
        }
        if (!dead.length) break;
        await this.fx.deaths(dead.map((d) => d.m));
        for (const d of dead) d.p.board = d.p.board.filter((m) => m !== d.m);
        // Positions shift as earlier minions are removed; account for that.
        for (const d of dead) {
          const removedBefore = dead.filter((o) => o.p === d.p && o.pos < d.pos).length;
          d.pos -= removedBefore;
        }
        for (const d of dead) {
          const def = this.def(d.m);
          if (def.deathrattle && !d.m.silenced) await def.deathrattle(this, { self: d.m, player: d.p, pos: d.pos });
        }
      }
      this.checkEnd();
    }

    checkEnd() {
      if (this.s.over) return;
      const [a, b] = this.s.players;
      const deadA = a.hero.hp <= 0, deadB = b.hero.hp <= 0;
      if (deadA || deadB) {
        this.s.over = true;
        this.s.winner = deadA && deadB ? -1 : deadA ? 1 : 0;
        this.fx.gameOver(this.s.winner);
      }
    }

    // ---------------------------------------------------------------- AI helpers
    legalActions(p) {
      const acts = [];
      if (this.s.over || p.idx !== this.s.current) return acts;
      for (const c of p.hand) {
        if (!this.canPlay(p, c)) continue;
        const d = this.def(c);
        if (this.needsTarget(p, c)) {
          for (const t of this.validTargets(d.target, p)) acts.push({ type: 'play', uid: c.uid, target: t.uid });
        } else acts.push({ type: 'play', uid: c.uid, target: null });
      }
      if (this.canUsePower(p)) {
        const hp = this.heroDef(p).power;
        if (hp.target) for (const t of this.validTargets(hp.target, p)) acts.push({ type: 'power', target: t.uid });
        else acts.push({ type: 'power', target: null });
      }
      for (const e of [p.hero, ...p.board]) {
        if (!this.canAttack(e)) continue;
        for (const t of this.attackTargets(e)) acts.push({ type: 'attack', src: e.uid, target: t.uid });
      }
      return acts;
    }

    async apply(p, a) {
      if (a.type === 'play') return this.playCard(p, a.uid, { target: a.target, pos: a.pos });
      if (a.type === 'power') return this.usePower(p, a.target);
      if (a.type === 'attack') return this.attack(a.src, a.target);
      return false;
    }
  }

  root.Game = Game;
  root.NullFx = NullFx;
  root.RULES = { MAX_BOARD, MAX_HAND, MAX_MANA };
})(typeof window !== 'undefined' ? window : globalThis);
