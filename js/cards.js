// Card database, heroes and decks. Card text uses ~keyword~ markup for highlighting.
(function (root) {
  const CARDS = {};
  function card(id, o) {
    o.id = id;
    o.type = o.type || 'minion';
    o.cls = o.cls || 'neutral';
    o.rarity = o.rarity || 'common';
    o.text = o.text || '';
    o.kw = o.kw || {};
    CARDS[id] = o;
  }

  // Small helpers used by effects.
  const enemyHero = (g, p) => g.opp(p).hero;
  const hitAll = async (g, list, n, src) => {
    for (const t of list) await g.damage(t, n, src, { quiet: true });
    await g.fx.wait(250);
  };

  // ------------------------------------------------------------------ NEUTRAL
  card('goblin_scout', { name: 'Goblin Scout', cost: 1, atk: 2, hp: 1, sprite: 'goblin' });
  card('shield_squire', { name: 'Shield Squire', cost: 1, atk: 1, hp: 1, kw: { divineShield: 1 }, text: '~Divine Shield~', sprite: 'squire' });
  card('mud_slime', { name: 'Mud Slime', cost: 1, atk: 1, hp: 2, kw: { taunt: 1 }, text: '~Taunt~', sprite: 'slime' });
  card('cave_bat', { name: 'Cave Bat', cost: 1, atk: 2, hp: 1, tribe: 'Beast', kw: { rush: 1 }, text: '~Rush~', sprite: 'bat' });
  card('fire_imp', {
    name: 'Fire Imp', cost: 1, atk: 3, hp: 2, tribe: 'Demon', sprite: 'imp',
    text: '~Battlecry:~ Deal 3 damage to your hero.',
    battlecry: async (g, c) => { await g.damage(c.player.hero, 3, c.self); },
  });
  card('kobold_adept', { name: 'Kobold Adept', cost: 2, atk: 2, hp: 2, kw: { spellDamage: 1 }, text: '~Spell Damage +1~', sprite: 'kobold' });
  card('swamp_croc', { name: 'Swamp Croc', cost: 2, atk: 3, hp: 2, tribe: 'Beast', sprite: 'croc' });
  card('loot_goblin', {
    name: 'Loot Goblin', cost: 2, atk: 2, hp: 1, sprite: 'lootgoblin',
    text: '~Deathrattle:~ Draw a card.',
    deathrattle: async (g, c) => { await g.draw(c.player, 1); },
  });
  card('bomb_bot', {
    name: 'Bomb Bot', cost: 2, atk: 2, hp: 1, tribe: 'Mech', sprite: 'robot',
    text: '~Deathrattle:~ Deal 2 damage to a random enemy.',
    deathrattle: async (g, c) => {
      const t = g.pick(g.enemyChars(c.player));
      if (t) { await g.fx.projectile(c.self, t, 'bomb'); await g.damage(t, 2, c.self); }
    },
  });
  card('venom_spider', { name: 'Venom Spider', cost: 2, atk: 1, hp: 2, tribe: 'Beast', kw: { poisonous: 1 }, text: '~Poisonous~', sprite: 'spider' });
  card('forest_pixie', {
    name: 'Forest Pixie', cost: 2, atk: 2, hp: 2, sprite: 'fairy', target: 'any',
    text: '~Battlecry:~ Restore 3 Health.',
    battlecry: async (g, c) => { if (c.target) await g.heal(c.target, 3, c.self); },
  });
  card('arcane_owl', {
    name: 'Arcane Owl', cost: 2, atk: 2, hp: 1, tribe: 'Beast', sprite: 'owl', target: 'minion',
    text: '~Battlecry:~ ~Silence~ a minion.',
    battlecry: async (g, c) => { if (c.target) await g.silence(c.target); },
  });
  card('shield_golem', { name: 'Shield Golem', cost: 3, atk: 2, hp: 4, tribe: 'Mech', kw: { taunt: 1 }, text: '~Taunt~', sprite: 'golem' });
  card('wolf_rider', { name: 'Wolf Rider', cost: 3, atk: 3, hp: 1, kw: { charge: 1 }, text: '~Charge~', sprite: 'orc' });
  card('blood_bat', { name: 'Blood Bat', cost: 3, atk: 2, hp: 4, tribe: 'Beast', kw: { lifesteal: 1 }, text: '~Lifesteal~', sprite: 'bloodbat' });
  card('war_chief', {
    name: 'War Chief', cost: 3, atk: 2, hp: 3, sprite: 'warchief', rarity: 'rare',
    text: 'Your other minions have +1 Attack.',
    aura: { atk: 1, filter: () => true },
  });
  card('holy_crusader', { name: 'Holy Crusader', cost: 3, atk: 3, hp: 1, kw: { divineShield: 1 }, text: '~Divine Shield~', sprite: 'knight' });
  card('scarecrow', {
    name: 'Scarecrow', cost: 3, atk: 2, hp: 3, sprite: 'scarecrow',
    text: '~Deathrattle:~ Summon a 2/1 Crow.',
    deathrattle: async (g, c) => { await g.summon(c.player, 'crow', c.pos); },
  });
  card('frost_yeti', { name: 'Frost Yeti', cost: 4, atk: 4, hp: 5, sprite: 'yeti' });
  card('bulwark_guard', { name: 'Bulwark Guard', cost: 4, atk: 3, hp: 5, kw: { taunt: 1 }, text: '~Taunt~', sprite: 'guard' });
  card('tinker_gnome', {
    name: 'Tinker Gnome', cost: 4, atk: 2, hp: 4, sprite: 'gnome',
    text: '~Battlecry:~ Summon a 2/1 Mech.',
    battlecry: async (g, c) => { await g.summon(c.player, 'minibot', c.player.board.indexOf(c.self) + 1); },
  });
  card('shadow_stalker', { name: 'Shadow Stalker', cost: 4, atk: 4, hp: 3, kw: { stealth: 1 }, text: '~Stealth~', sprite: 'rogue' });
  card('night_blade', {
    name: 'Night Blade', cost: 5, atk: 4, hp: 4, sprite: 'nightblade',
    text: '~Battlecry:~ Deal 3 damage to the enemy hero.',
    battlecry: async (g, c) => {
      const t = enemyHero(g, c.player);
      await g.fx.projectile(c.self, t, 'dagger');
      await g.damage(t, 3, c.self);
    },
  });
  card('storm_harpy', { name: 'Storm Harpy', cost: 5, atk: 3, hp: 5, kw: { windfury: 1 }, text: '~Windfury~', sprite: 'harpy' });
  card('temple_healer', {
    name: 'Temple Healer', cost: 5, atk: 4, hp: 5, sprite: 'priest',
    text: '~Battlecry:~ Restore 4 Health to your hero.',
    battlecry: async (g, c) => { await g.heal(c.player.hero, 4, c.self); },
  });
  card('rock_ogre', { name: 'Rock Ogre', cost: 6, atk: 6, hp: 7, sprite: 'ogre' });
  card('flame_djinn', {
    name: 'Flame Djinn', cost: 6, atk: 5, hp: 5, tribe: 'Elemental', sprite: 'elemental', target: 'any', rarity: 'rare',
    text: '~Battlecry:~ Deal 3 damage.',
    battlecry: async (g, c) => {
      if (!c.target) return;
      await g.fx.projectile(c.self, c.target, 'fire');
      await g.damage(c.target, 3, c.self);
    },
  });
  card('arena_champion', { name: 'Arena Champion', cost: 6, atk: 6, hp: 5, kw: { taunt: 1 }, text: '~Taunt~', sprite: 'champion' });
  card('bone_lord', {
    name: 'Bone Lord', cost: 6, atk: 4, hp: 5, sprite: 'lich', rarity: 'epic',
    text: '~Deathrattle:~ Summon two 2/2 Skeletons.',
    deathrattle: async (g, c) => {
      await g.summon(c.player, 'skeleton', c.pos);
      await g.summon(c.player, 'skeleton', c.pos);
    },
  });
  card('doom_dragon', {
    name: 'Doom Dragon', cost: 8, atk: 7, hp: 7, tribe: 'Dragon', sprite: 'dragon', rarity: 'legendary',
    text: '~Battlecry:~ Deal 2 damage to all other minions.',
    battlecry: async (g, c) => {
      await g.fx.aoe('fire', c.player);
      await hitAll(g, g.allMinions().filter((m) => m !== c.self), 2, c.self);
    },
  });

  // ------------------------------------------------------------------ TOKENS
  card('crow', { name: 'Crow', cost: 1, atk: 2, hp: 1, tribe: 'Beast', sprite: 'bird', token: true });
  card('minibot', { name: 'Mech', cost: 1, atk: 2, hp: 1, tribe: 'Mech', sprite: 'minibot', token: true });
  card('skeleton', { name: 'Skeleton', cost: 2, atk: 2, hp: 2, sprite: 'skeleton', token: true });
  card('sheep', { name: 'Sheep', cost: 1, atk: 1, hp: 1, tribe: 'Beast', sprite: 'sheep', token: true });
  card('recruit', { name: 'Recruit', cost: 1, atk: 1, hp: 1, sprite: 'recruit', token: true });
  card('hound', { name: 'Hound', cost: 1, atk: 1, hp: 1, tribe: 'Beast', kw: { charge: 1 }, text: '~Charge~', sprite: 'hound', token: true });
  card('hyena', { name: 'Hyena', cost: 2, atk: 2, hp: 2, tribe: 'Beast', sprite: 'hyena', token: true });
  card('grizzly', { name: 'Grizzly', cost: 3, atk: 4, hp: 4, tribe: 'Beast', kw: { taunt: 1 }, text: '~Taunt~', sprite: 'bear', token: true });
  card('boar', { name: 'Wild Boar', cost: 3, atk: 4, hp: 2, tribe: 'Beast', kw: { charge: 1 }, text: '~Charge~', sprite: 'boar', token: true });
  card('hawk', { name: 'Hawk', cost: 3, atk: 2, hp: 4, tribe: 'Beast', sprite: 'hawk', token: true, text: 'Your other minions have +1 Attack.', aura: { atk: 1, filter: () => true } });
  card('coin', {
    name: 'Lucky Coin', type: 'spell', cost: 0, sprite: 'coin', token: true,
    text: 'Gain 1 Mana Crystal this turn only.',
    cast: async (g, c) => { c.player.mana = Math.min(10, c.player.mana + 1); },
  });
  card('lightblade', { name: 'Lightblade', type: 'weapon', cost: 5, atk: 5, hp: 3, sprite: 'sword', token: true, cls: 'paladin' });

  // ------------------------------------------------------------------ MAGE
  card('mana_wyrm', {
    name: 'Spell Serpent', cls: 'mage', cost: 1, atk: 1, hp: 3, sprite: 'serpent',
    text: 'Whenever you cast a spell, gain +1 Attack.',
    triggers: { friendlySpell: async (g, self) => { self.atk += 1; await g.fx.buff(self); } },
  });
  card('arcane_missiles', {
    name: 'Mana Darts', cls: 'mage', type: 'spell', cost: 1, sprite: 'missiles',
    text: 'Deal 3 damage randomly split among all enemies.',
    cast: async (g, c) => {
      const n = g.spellDmg(c.player, 3);
      for (let i = 0; i < n; i++) {
        const t = g.pick(g.enemyChars(c.player).filter((e) => e.hp > 0));
        if (!t) break;
        await g.fx.projectile(c.player.hero, t, 'arcane', 0.6);
        await g.damage(t, 1, null);
      }
    },
  });
  card('frost_bolt', {
    name: 'Ice Shard', cls: 'mage', type: 'spell', cost: 2, sprite: 'frostbolt', target: 'any',
    text: 'Deal 3 damage to a character and ~Freeze~ it.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'frost');
      await g.damage(c.target, g.spellDmg(c.player, 3), null);
      await g.freeze(c.target);
    },
  });
  card('arcane_intellect', {
    name: 'Deep Study', cls: 'mage', type: 'spell', cost: 3, sprite: 'book',
    text: 'Draw 2 cards.',
    cast: async (g, c) => { await g.draw(c.player, 2); },
  });
  card('frost_nova', {
    name: 'Cold Snap', cls: 'mage', type: 'spell', cost: 3, sprite: 'snowflake',
    text: '~Freeze~ all enemy minions.',
    cast: async (g, c) => {
      await g.fx.aoe('frost', c.player);
      for (const m of g.opp(c.player).board) await g.freeze(m);
    },
  });
  card('water_elemental', {
    name: 'Tide Spirit', cls: 'mage', cost: 4, atk: 3, hp: 6, tribe: 'Elemental', sprite: 'waterelem',
    text: '~Freeze~ any character damaged by this minion.',
    triggers: { dealtDamage: async (g, self, target) => { await g.freeze(target); } },
  });
  card('fireball', {
    name: 'Fireball', cls: 'mage', type: 'spell', cost: 4, sprite: 'fireball', target: 'any',
    text: 'Deal 6 damage.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'fire');
      await g.damage(c.target, g.spellDmg(c.player, 6), null);
    },
  });
  card('sheepify', {
    name: 'Sheepify', cls: 'mage', type: 'spell', cost: 4, sprite: 'sheep', target: 'minion', rarity: 'rare',
    text: 'Transform a minion into a 1/1 Sheep.',
    cast: async (g, c) => { await g.transform(c.target, 'sheep'); },
  });
  card('high_archmage', { name: 'High Archmage', cls: 'mage', cost: 6, atk: 4, hp: 7, kw: { spellDamage: 1 }, text: '~Spell Damage +1~', sprite: 'wizard', rarity: 'rare' });
  card('inferno', {
    name: 'Inferno', cls: 'mage', type: 'spell', cost: 7, sprite: 'inferno', rarity: 'rare',
    text: 'Deal 4 damage to all enemy minions.',
    cast: async (g, c) => {
      await g.fx.aoe('fire', c.player);
      await hitAll(g, g.opp(c.player).board.slice(), g.spellDmg(c.player, 4), null);
    },
  });
  card('pyroblast', {
    name: 'Meteor', cls: 'mage', type: 'spell', cost: 10, sprite: 'pyro', target: 'any', rarity: 'epic',
    text: 'Deal 10 damage.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'bigfire', 1.6);
      await g.damage(c.target, g.spellDmg(c.player, 10), null);
    },
  });

  // ------------------------------------------------------------------ WARRIOR
  card('war_axe', { name: 'War Axe', cls: 'warrior', type: 'weapon', cost: 2, atk: 3, hp: 2, sprite: 'axe' });
  card('execute', {
    name: 'Execute', cls: 'warrior', type: 'spell', cost: 1, sprite: 'execute', target: 'damagedEnemyMinion',
    text: 'Destroy a damaged enemy minion.',
    cast: async (g, c) => { await g.fx.aoe('slash', c.player, c.target); await g.destroy(c.target); },
  });
  card('whirlwind', {
    name: 'Whirlwind', cls: 'warrior', type: 'spell', cost: 1, sprite: 'tornado',
    text: 'Deal 1 damage to ALL minions.',
    cast: async (g, c) => {
      await g.fx.aoe('wind', c.player);
      await hitAll(g, g.allMinions(), g.spellDmg(c.player, 1), null);
    },
  });
  card('shield_slam', {
    name: 'Shield Bash', cls: 'warrior', type: 'spell', cost: 1, sprite: 'shieldslam', target: 'minion', rarity: 'epic',
    text: 'Deal 1 damage to a minion for each Armor you have.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'shield');
      await g.damage(c.target, g.spellDmg(c.player, c.player.hero.armor), null);
    },
  });
  card('armorsmith', {
    name: 'Plate Forger', cls: 'warrior', cost: 2, atk: 1, hp: 4, sprite: 'dwarf', rarity: 'rare',
    text: 'Whenever a friendly minion takes damage, gain 1 Armor.',
    triggers: { friendlyDamaged: async (g, self) => { await g.gainArmor(g.P(self.owner), 1); } },
  });
  card('cleave', {
    name: 'Cleave', cls: 'warrior', type: 'spell', cost: 2, sprite: 'swords',
    text: 'Deal 2 damage to two random enemy minions.',
    requires: (g, p) => g.opp(p).board.length > 0,
    cast: async (g, c) => {
      const pool = g.opp(c.player).board.slice();
      const picks = g.shuffleCopy(pool).slice(0, 2);
      for (const t of picks) { await g.fx.aoe('slash', c.player, t); await g.damage(t, g.spellDmg(c.player, 2), null); }
    },
  });
  card('shield_block', {
    name: 'Hold the Line', cls: 'warrior', type: 'spell', cost: 3, sprite: 'shield',
    text: 'Gain 5 Armor. Draw a card.',
    cast: async (g, c) => { await g.gainArmor(c.player, 5); await g.draw(c.player, 1); },
  });
  card('berserker_elite', { name: 'Berserker Elite', cls: 'warrior', cost: 4, atk: 4, hp: 3, kw: { charge: 1 }, text: '~Charge~', sprite: 'berserker' });
  card('shield_maiden', {
    name: 'Shield Maiden', cls: 'warrior', cost: 6, atk: 5, hp: 5, sprite: 'maiden', rarity: 'rare',
    text: '~Battlecry:~ Gain 5 Armor.',
    battlecry: async (g, c) => { await g.gainArmor(c.player, 5); },
  });
  card('great_axe', { name: 'Great Axe', cls: 'warrior', type: 'weapon', cost: 5, atk: 5, hp: 2, sprite: 'axe', rarity: 'rare' });
  card('blood_warlord', {
    name: 'Blood Warlord', cls: 'warrior', cost: 8, atk: 4, hp: 9, kw: { charge: 1 }, sprite: 'warlord', rarity: 'legendary',
    text: '~Charge~. Has +6 Attack while damaged.',
    enrage: 6,
  });

  // ------------------------------------------------------------------ PALADIN
  card('might_blessing', {
    name: 'Might Blessing', cls: 'paladin', type: 'spell', cost: 1, sprite: 'blessing', target: 'minion',
    text: 'Give a minion +3 Attack.',
    cast: async (g, c) => { await g.buff(c.target, 3, 0); },
  });
  card('shield_bearer', {
    name: 'Shield Bearer', cls: 'paladin', cost: 2, atk: 2, hp: 2, sprite: 'shieldbearer', target: 'friendlyMinion',
    text: '~Battlecry:~ Give a friendly minion ~Divine Shield~.',
    battlecry: async (g, c) => { if (c.target) { c.target.divineShield = true; await g.fx.buff(c.target); } },
  });
  card('holy_light', {
    name: 'Mending Light', cls: 'paladin', type: 'spell', cost: 2, sprite: 'holy', target: 'any',
    text: 'Restore 8 Health.',
    cast: async (g, c) => { await g.heal(c.target, 8, null); },
  });
  card('equality', {
    name: 'Even Scales', cls: 'paladin', type: 'spell', cost: 2, sprite: 'scales', rarity: 'rare',
    text: 'Change the Health of ALL minions to 1.',
    cast: async (g) => {
      await g.fx.aoe('holy', null);
      for (const m of g.allMinions()) { m.maxHp = 1; m.hp = 1; await g.fx.buff(m); }
    },
  });
  card('kings_blessing', {
    name: "King's Blessing", cls: 'paladin', type: 'spell', cost: 4, sprite: 'crown', target: 'minion',
    text: 'Give a minion +4/+4.',
    cast: async (g, c) => { await g.buff(c.target, 4, 4); },
  });
  card('wrath_hammer', {
    name: 'Wrath Hammer', cls: 'paladin', type: 'spell', cost: 4, sprite: 'hammer', target: 'any',
    text: 'Deal 3 damage. Draw a card.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'holy');
      await g.damage(c.target, g.spellDmg(c.player, 3), null);
      await g.draw(c.player, 1);
    },
  });
  card('hallowed_ground', {
    name: 'Hallowed Ground', cls: 'paladin', type: 'spell', cost: 4, sprite: 'consecrate',
    text: 'Deal 2 damage to all enemies.',
    cast: async (g, c) => {
      await g.fx.aoe('holy', c.player);
      await hitAll(g, g.enemyChars(c.player), g.spellDmg(c.player, 2), null);
    },
  });
  card('silver_hammer', {
    name: 'Silver Hammer', cls: 'paladin', type: 'weapon', cost: 4, atk: 4, hp: 2, sprite: 'hammer', rarity: 'rare',
    text: 'Whenever your hero attacks, restore 2 Health to it.',
    onHeroAttack: async (g, p) => { await g.heal(p.hero, 2, null); },
  });
  card('crown_guardian', {
    name: 'Crown Guardian', cls: 'paladin', cost: 7, atk: 5, hp: 6, sprite: 'crownguard',
    text: '~Battlecry:~ Restore 6 Health to your hero.',
    battlecry: async (g, c) => { await g.heal(c.player.hero, 6, c.self); },
  });
  card('lightbringer', {
    name: 'Dawn Paragon', cls: 'paladin', cost: 8, atk: 6, hp: 6, sprite: 'paladin', rarity: 'legendary',
    kw: { divineShield: 1, taunt: 1 },
    text: '~Divine Shield~, ~Taunt~. ~Deathrattle:~ Equip a 5/3 Lightblade.',
    deathrattle: async (g, c) => { await g.equip(c.player, 'lightblade'); },
  });

  // ------------------------------------------------------------------ HUNTER
  card('pack_wolf', {
    name: 'Pack Wolf', cls: 'hunter', cost: 1, atk: 1, hp: 1, tribe: 'Beast', sprite: 'wolf',
    text: 'Your other Beasts have +1 Attack.',
    aura: { atk: 1, filter: (g, m) => g.tribeOf(m) === 'Beast' },
  });
  card('jungle_panther', { name: 'Jungle Panther', cls: 'hunter', cost: 3, atk: 4, hp: 2, tribe: 'Beast', kw: { stealth: 1 }, text: '~Stealth~', sprite: 'panther' });
  card('arcane_shot', {
    name: 'Hex Arrow', cls: 'hunter', type: 'spell', cost: 1, sprite: 'arcaneshot', target: 'any',
    text: 'Deal 2 damage.',
    cast: async (g, c) => {
      await g.fx.projectile(c.player.hero, c.target, 'arcane');
      await g.damage(c.target, g.spellDmg(c.player, 2), null);
    },
  });
  card('hunters_bow', { name: "Hunter's Bow", cls: 'hunter', type: 'weapon', cost: 3, atk: 3, hp: 2, sprite: 'bow' });
  card('kill_command', {
    name: 'Hunt Signal', cls: 'hunter', type: 'spell', cost: 2, sprite: 'killpaw', target: 'any',
    text: 'Deal 3 damage. If you control a Beast, deal 5 instead.',
    cast: async (g, c) => {
      const beast = c.player.board.some((m) => g.tribeOf(m) === 'Beast');
      await g.fx.projectile(c.player.hero, c.target, 'claw');
      await g.damage(c.target, g.spellDmg(c.player, beast ? 5 : 3), null);
    },
  });
  card('wild_call', {
    name: 'Wild Call', cls: 'hunter', type: 'spell', cost: 3, sprite: 'wildpaw',
    text: 'Summon a random beast companion.',
    requires: (g, p) => p.board.length < 7,
    cast: async (g, c) => { await g.summon(c.player, g.pick(['grizzly', 'boar', 'hawk'])); },
  });
  card('unleash_hounds', {
    name: 'Loose the Pack', cls: 'hunter', type: 'spell', cost: 3, sprite: 'hound',
    text: 'For each enemy minion, summon a 1/1 Hound with ~Charge~.',
    requires: (g, p) => g.opp(p).board.length > 0 && p.board.length < 7,
    cast: async (g, c) => {
      const n = g.opp(c.player).board.length;
      for (let i = 0; i < n; i++) await g.summon(c.player, 'hound');
    },
  });
  card('multi_shot', {
    name: 'Arrow Volley', cls: 'hunter', type: 'spell', cost: 4, sprite: 'arrow',
    text: 'Deal 3 damage to two random enemy minions.',
    requires: (g, p) => g.opp(p).board.length > 0,
    cast: async (g, c) => {
      const picks = g.shuffleCopy(g.opp(c.player).board).slice(0, 2);
      for (const t of picks) { await g.fx.projectile(c.player.hero, t, 'arrow', 0.7); await g.damage(t, g.spellDmg(c.player, 3), null); }
    },
  });
  card('beast_tamer', {
    name: 'Beast Tamer', cls: 'hunter', cost: 4, atk: 4, hp: 3, sprite: 'ranger', target: 'friendlyBeast',
    text: '~Battlecry:~ Give a friendly Beast +2/+2 and ~Taunt~.',
    battlecry: async (g, c) => { if (c.target) { c.target.taunt = true; await g.buff(c.target, 2, 2); } },
  });
  card('plains_lion', {
    name: 'Plains Lion', cls: 'hunter', cost: 6, atk: 6, hp: 5, tribe: 'Beast', sprite: 'lion', rarity: 'rare',
    text: '~Deathrattle:~ Summon two 2/2 Hyenas.',
    deathrattle: async (g, c) => {
      await g.summon(c.player, 'hyena', c.pos);
      await g.summon(c.player, 'hyena', c.pos);
    },
  });
  card('tyrant_rex', { name: 'Tyrant Rex', cls: 'hunter', cost: 9, atk: 8, hp: 8, tribe: 'Beast', kw: { charge: 1 }, text: '~Charge~', sprite: 'dino', rarity: 'legendary' });

  // ------------------------------------------------------------------ HEROES
  const HEROES = {
    mage: {
      name: 'Vela', title: 'Arcanist', sprite: 'hero_mage', color: '#3b5dc9', dark: '#29366f',
      power: {
        name: 'Ember Spark', cost: 2, target: 'any', icon: 'fireball', text: 'Deal 1 damage.',
        use: async (g, c) => {
          await g.fx.projectile(c.player.hero, c.target, 'fire', 0.7);
          await g.damage(c.target, 1, null);
        },
      },
    },
    warrior: {
      name: 'Brakka', title: 'Warlord', sprite: 'hero_warrior', color: '#b13e53', dark: '#73172d',
      power: {
        name: 'Iron Skin', cost: 2, icon: 'armor', text: 'Gain 2 Armor.',
        use: async (g, c) => { await g.gainArmor(c.player, 2); },
      },
    },
    paladin: {
      name: 'Aldric', title: 'Knight', sprite: 'hero_paladin', color: '#e6a33c', dark: '#8b5a3c',
      power: {
        name: 'Reinforce', cost: 2, icon: 'recruit', text: 'Summon a 1/1 Recruit.',
        requires: (g, p) => p.board.length < 7,
        use: async (g, c) => { await g.summon(c.player, 'recruit'); },
      },
    },
    hunter: {
      name: 'Sylva', title: 'Ranger', sprite: 'hero_hunter', color: '#38b764', dark: '#1e5c3a',
      power: {
        name: 'Sure Shot', cost: 2, icon: 'arrow', text: 'Deal 2 damage to the enemy hero.',
        use: async (g, c) => {
          const t = g.opp(c.player).hero;
          await g.fx.projectile(c.player.hero, t, 'arrow', 0.7);
          await g.damage(t, 2, null);
        },
      },
    },
  };

  const x2 = (...ids) => ids.flatMap((id) => [id, id]);
  const DECKS = {
    mage: [
      ...x2('mana_wyrm', 'arcane_missiles', 'frost_bolt', 'arcane_intellect', 'water_elemental', 'fireball'),
      'frost_nova', 'sheepify', 'high_archmage', 'inferno', 'pyroblast',
      'goblin_scout', ...x2('kobold_adept'), 'swamp_croc', 'loot_goblin', 'forest_pixie', 'shield_golem',
      ...x2('frost_yeti'), 'shadow_stalker', 'flame_djinn', 'doom_dragon', 'bulwark_guard',
    ],
    warrior: [
      ...x2('war_axe', 'execute', 'armorsmith', 'shield_block', 'berserker_elite'),
      'whirlwind', 'shield_slam', 'cleave', 'great_axe', 'blood_warlord',
      'mud_slime', ...x2('shield_maiden'), 'war_chief', ...x2('bomb_bot'), 'shadow_stalker', 'shield_golem', 'wolf_rider',
      ...x2('frost_yeti'), 'bulwark_guard', 'night_blade', 'rock_ogre', 'arena_champion',
    ],
    paladin: [
      ...x2('might_blessing', 'shield_bearer', 'kings_blessing', 'wrath_hammer'),
      'hallowed_ground', 'mud_slime', 'holy_light', 'equality', 'silver_hammer', 'crown_guardian', 'lightbringer',
      ...x2('shield_squire'), 'goblin_scout', 'loot_goblin', 'forest_pixie', ...x2('holy_crusader'), 'war_chief',
      'scarecrow', 'frost_yeti', 'tinker_gnome', 'temple_healer', 'storm_harpy', 'arena_champion', 'bone_lord',
    ],
    hunter: [
      ...x2('pack_wolf', 'arcane_shot', 'kill_command', 'wild_call', 'beast_tamer'),
      'hunters_bow', 'unleash_hounds', 'multi_shot', 'plains_lion', 'tyrant_rex',
      ...x2('jungle_panther', 'swamp_croc'), 'bulwark_guard', 'arcane_owl', ...x2('blood_bat'), 'wolf_rider',
      'scarecrow', ...x2('frost_yeti'), 'storm_harpy', 'rock_ogre', 'night_blade',
    ],
  };

  const KEYWORDS = {
    taunt: ['Taunt', 'Enemies must attack this minion.'],
    charge: ['Charge', 'Can attack immediately.'],
    rush: ['Rush', 'Can attack minions immediately.'],
    divineShield: ['Divine Shield', 'The first time this takes damage, ignore it.'],
    windfury: ['Windfury', 'Can attack twice each turn.'],
    stealth: ['Stealth', "Can't be attacked or targeted until it attacks."],
    poisonous: ['Poisonous', 'Destroy any minion damaged by this.'],
    lifesteal: ['Lifesteal', 'Damage dealt also heals your hero.'],
    freeze: ['Freeze', 'Frozen characters lose their next attack.'],
    battlecry: ['Battlecry', 'Does something when you play it from your hand.'],
    deathrattle: ['Deathrattle', 'Does something when it dies.'],
    silence: ['Silence', 'Removes all card text and enchantments.'],
    spellDamage: ['Spell Damage', 'Your spells deal extra damage.'],
  };

  root.CARDS = CARDS;
  root.HEROES = HEROES;
  root.DECKS = DECKS;
  root.KEYWORDS = KEYWORDS;
})(typeof window !== 'undefined' ? window : globalThis);
