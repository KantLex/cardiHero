# CardiHero

A 1v1 collectible-card-style battler in the spirit of Hearthstone, drawn entirely in pixel art.
Pure HTML5 canvas + vanilla JavaScript — no build step, no dependencies, no external assets.
Every sprite, the font, and all sound effects are generated in code.

## Play

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .        # or: python3 -m http.server
```

## How to play

- Each hero starts at **30 health**. Reduce the enemy hero to 0 to win.
- You gain a mana crystal every turn (max 10) and draw a card at the start of your turn.
- **Drag** a card from your hand onto the board to play it. Targeted spells turn into an arrow — drop it on a target.
- **Drag** from a glowing minion (or your armed hero) to an enemy to attack. You can also click the attacker, then click the target.
- Click your **hero power** (round button next to your hero) once per turn.
- Hover over anything to inspect it (tap on touch screens). Right-click or `Esc` cancels. `Space` ends your turn, `M` mutes.

## Features

- 4 heroes with unique hero powers and 30-card decks:
  - **Vela the Arcanist** (mage) — Fireblast: deal 1 damage.
  - **Brakka the Warlord** (warrior) — Armor Up!: gain 2 armor.
  - **Aldric the Knight** (paladin) — Reinforce: summon a 1/1 Recruit.
  - **Sylva the Ranger** (hunter) — Steady Shot: 2 damage to the enemy hero.
- ~80 cards: minions, spells and weapons with Taunt, Charge, Rush, Divine Shield, Windfury, Stealth,
  Poisonous, Lifesteal, Freeze, Silence, Spell Damage, Battlecry, Deathrattle, auras and enrage.
- Full rules: mulligan, The Coin for the second player, fatigue, hand/board limits, overdraw burning,
  summoning sickness, taunt blocking, weapons with durability, armor.
- AI opponent that simulates every legal move one step ahead and picks the best (Normal / Easy).
- Animations: attack lunges, projectiles, particles, screen shake, floating damage numbers,
  enemy card reveals, turn banners.
- Chiptune sound effects synthesized with WebAudio.
- Pause menu with game speed (1x/2x/3x), sound toggle and concede.

## Project layout

| File | Purpose |
| --- | --- |
| `js/font.js` | Variable-width 5px bitmap font |
| `js/sprites.js` | Palette and hand-drawn 16x16 / 24x24 sprites (with palette-swapped variants) |
| `js/cards.js` | Card database, heroes, hero powers and decks |
| `js/engine.js` | Rules engine (JSON state, async actions with animation hooks) |
| `js/ai.js` | Greedy one-ply search AI |
| `js/audio.js` | Procedural sound effects |
| `js/render.js` | Drawing primitives, cards, minions, heroes |
| `js/ui.js` | Screens, input, animations and turn flow |
| `tests/sim.js` | Headless AI-vs-AI games to smoke-test the engine |

## Tests

```sh
node tests/sim.js 200
```

Plays 200 headless AI-vs-AI games across all hero matchups, checks invariants after every action,
and prints win rates per hero.
