// Pixel art: palette + hand-drawn sprites.
// `h` sprites are left halves that get mirrored; `f` sprites are full rows.
(function (root) {
  const PAL = {
    k: '#1a1c2c', p: '#5d275d', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', l: '#a7f070',
    g: '#38b764', t: '#257179', n: '#29366f', b: '#3b5dc9', c: '#41a6f6', a: '#73eff7',
    w: '#f4f4f4', s: '#94b0c2', d: '#566c86', e: '#333c57', f: '#f2c19b', h: '#8b5a3c',
    u: '#4f2f23', m: '#73172d', q: '#e6a33c', v: '#1e5c3a', i: '#ff8fb0', x: '#d9a066',
    z: '#b55ac8',
  };

  const S = {
    // ---------------- creatures ----------------
    goblin: { f: [
      '................',
      '................',
      '.....kkkkkk.....',
      'kk..kggggggk..kk',
      'kgk.kggggggk.kgk',
      '.kgkggggggggkgk.',
      '..kggykggykggk..',
      '..kggyyggyyggk..',
      '...kggggggggk...',
      '...kgwkwkwkgk...',
      '....kggggggk....',
      '...khhhhhhhhk...',
      '..khhuhhhhuhhk..',
      '..kgkhhhhhhkgk..',
      '...kkhhkkhhkk...',
      '....kuk..kuk....',
    ] },
    squire: { h: [
      '........', '......kk', '.....ksw', '....ksws', '....ksss', '...kdkkk', '...kdfkf', '...kdfff',
      '....kkkk', '...kbbby', '..kbbbby', '..kfkbby', '..kkkbbb', '....kddk', '....kddk', '....kkk.',
    ] },
    slime: { h: [
      '........', '........', '........', '.......k', '......kl', '.....klg', '....klgg', '...klggg',
      '..klwkgg', '..klkkgg', '.klggggg', '.kgggggk', '.kgggggg', '.kvggggg', '..kvvvvv', '...kkkkk',
    ] },
    bat: { h: [
      '........', '........', '....k...', '....kk..', '....kpkk', 'k...kppp', 'kk.kpykp', 'kpkkpppp',
      'kpppkpwp', 'kppppkpp', 'kppppppk', 'kpk.kppp', 'kk...kpp', 'k.....kk', '......k.', '........',
    ] },
    imp: { h: [
      '........', '..k.....', '..kk....', '..kyk.kk', '...kykrr', '...krrrr', '..krrykr', '..krryyr',
      '..krrrrr', '...krwkw', '....krrr', '..kkkmrr', '.krk.krr', '..k..kmr', '.....krk', '.....kk.',
    ] },
    kobold: { h: [
      '.......k', '......kb', '......ky', '.....kbb', '....kbbb', '..kkkkkk', '...khhhh', '..khhwkh',
      '..khhkkh', '...khhhk', '....kxxx', '...kbkxw', '..kbbbkx', '..kbbbbb', '...kbbbk', '....kkk.',
    ] },
    croc: { f: [
      '................',
      '................',
      '..kkk...........',
      '.kwkgk..........',
      '.kkggkkkkkkkk...',
      'kgggggggggggggk.',
      'kgvgggggvggggggk',
      'kggggggggggggggk',
      '.kwwkwwkwwkwwkk.',
      '.krrrrrrrrrrrrk.',
      '.kkwwkwwkwwkwwk.',
      'kggggggggggggggk',
      'kgvgggvgggvggggk',
      '.kggggggggggggk.',
      '..kkkkkkkkkkkk..',
      '................',
    ] },
    robot: { h: [
      '.......o', '......oy', '.......k', '...kkkkk', '...kswss', '...kskkk', '...kskrk', '...kskkk',
      '...kssss', '...kdddd', '..kkkkkk', '.kdk.krr', '.kdk.krw', '.kk..krr', '.....kdk', '....kkk.',
    ] },
    spider: { h: [
      '........', '........', '........', '..k.....', '...k..kk', 'k...kkee', '.k.keeee', '..kkerre',
      'kkkeeeee', '...keeee', 'kk.keegl', '..k.keel', '.k..keee', 'k....kke', '........', '........',
    ] },
    fairy: { h: [
      '..y.....', '.....kkk', '.kk.kiii', 'kaakiiff', 'kaaakfkf', 'kaaaakfi', '.kaaakkk', '..kaklll',
      '...kkfll', '....klll', '...kllll', '..kgllll', '..kkkkkk', '.....kfk', '.....kk.', '........',
    ] },
    owl: { h: [
      '........', '...kk...', '...khk..', '...khhkk', '..khhhhh', '..kyyyhh', '.kyykyyh', '.kyyyyho',
      '..khhhho', '..khxxhh', '.khhxhxh', '.khhhxxh', '.khhhhhh', '..khhhhh', '...kokkk', '........',
    ] },
    golem: { h: [
      '........', '....kkkk', '...kssss', '...ksdss', '...ksaks', '...kssdd', '.kkkkkkk', 'kssdksss',
      'ksdkssds', 'ksdksdss', 'kssksssd', 'kkkkssss', '...ksssk', '...kssk.', '..ksssk.', '..kkkk..',
    ] },
    knight: { h: [
      '......kr', '.....krr', '....kkkk', '...ksssw', '..kssssw', '..kskkkk', '..kskkyk', '..ksssss',
      '..kdssss', '.kkkkkkk', 'kssdkwwy', 'kssdkyyy', 'kssdkwwy', '.kkdkwwy', '...kdddk', '...kkkk.',
    ] },
    orc: { h: [
      '........', '..k.....', '..wk....', '..wwkkkk', '...kdddd', '...kdsss', '..kkkkkk', '..kggrgg',
      '..kggggg', '..kgwggk', '...kgggg', '.kkkhhhh', 'kgghhuhh', 'kgkhhhhh', 'kk.khhkh', '...kuk..',
    ] },
    gnome: { h: [
      '........', '....kkkk', '...krrrr', '..krrrrr', '..kkkkkk', '..kaakff', '..kffffo', '..kwwwwf',
      '...kwwww', '..kbkwww', '.kbbbkww', '.kfkbbbb', '.kkkbbbb', '...khhhh', '...khkk.', '...kkk..',
    ] },
    minibot: { h: [
      '........', '........', '........', '.......k', '......kr', '....kkkk', '...kssss', '...ksccs',
      '...kssss', '...ksdkd', '..kkkkkk', '.ksk.kdd', '.kk..kdd', '.....kkk', '....ksk.', '....kk..',
    ] },
    rogue: { h: [
      '........', '.....kkk', '....keee', '...keeee', '..keeekk', '..keekkk', '..keekak', '..keekkk',
      '...keeee', '..keeeee', '.kwkeeee', '.kwkeeee', '.khkeeee', '..keeeee', '...keek.', '...kkk..',
    ] },
    harpy: { h: [
      '........', 'k.......', 'kck.....', 'kcck.kkk', 'kcccpppp', '.kccpfkf', '.kccpfff', '..kccpkk',
      '..kcckyy', '...kckyy', '...kkyyy', '....kyyy', '....kkyk', '.....ko.', '....koo.', '........',
    ] },
    priest: { h: [
      '....yyyy', '...y....', '....kkkk', '...kwwww', '..kwwfff', '..kwfkff', '..kwffff', '..kwwfff',
      '..kwwwww', '.kwwwwwy', '.kwwwwwy', 'kfkwwwwy', 'kkwwwwwy', '.kwwwwwy', '.kwwwwwy', '.kkkkkkk',
    ] },
    ogre: { h: [
      '........', '....kkkk', '...kxxxx', '..kxxxxx', '..kxkkxx', '..kxwkxx', '..kxxxhh', '..kxkwkw',
      '...kxxxx', '.kkkhhhh', 'kxxkhuhh', 'kxxkhhhh', 'kxxkhhhh', 'kkkkuuuu', '..kxxk..', '..kkkk..',
    ] },
    elemental: { h: [
      '........', '.......k', '...k..ky', '..kyk.ky', '..kyokyo', '.kyooooo', '.kyowkoo', '.kyokkoo',
      '.kyooook', '..kyoooo', '..kryooo', '...kryoo', '...krryo', '....krry', '.....krr', '......kk',
    ] },
    dragon: { h: [
      '........', 'kk......', 'krk...kk', 'krrk.kyk', 'krrrkkrr', 'krrrkrrr', 'krrkrykr', 'krrkrrrr',
      '.krkmrrr', '.kkkkrrk', '....kmrw', '...kmrrr', '..kmryyy', '..kmryyy', '...kmrry', '...kkk..',
    ] },
    lich: { h: [
      '....y..y', '....yyyy', '...kwwww', '..kwwwww', '..kwkkww', '..kwakww', '..kwwwwk', '...kwkwk',
      '...kkkkk', '.kpppppp', 'kppppppp', 'kwkppppp', 'kkpppppp', '.kpppppp', '.kpppppp', '.kkkkkkk',
    ] },
    skeleton: { h: [
      '........', '....kkkk', '...kwwww', '..kwwwww', '..kwkkww', '..kwkkww', '..kwwwwk', '...kwkwk',
      '....kkkk', '...kwwww', '..kwkkkw', '..kwwwww', '..kwkkkw', '...kkwkw', '....kwk.', '....kk..',
    ] },
    serpent: { h: [
      '........', '........', '.....kkk', '....kccc', '...kcykc', '...kcccc', '....kccc', '.....kcc',
      '...kkkcc', '..kcckcc', '.kcbbbkc', '.kcbkkbb', '.kcbbbbb', '..kcccck', '...kkkkk', '........',
    ] },
    wizard: { h: [
      '.......k', '......kb', '......kb', '.....kbb', '....kbbb', '..kkkkkk', '...kffff', '...kfkff',
      '..kwwwww', '..kwwwww', '.kbkwwww', '.kbbkwww', '.kfbbkww', '.kbbbbkw', '.kbbbbbb', '.kkkkkkk',
    ] },
    dwarf: { h: [
      '........', '.k......', '.wk..kkk', '.wwkssss', '..kddddd', '..kffkff', '..kffffo', '..kooooo',
      '..kooooo', '.kkkoooo', 'kddkkooo', 'kfdddkoo', 'kkdddddk', '...khhhh', '...khk..', '...kkk..',
    ] },
    ranger: { h: [
      '........', '....kkkk', '...kgggg', '.kkkkkkk', '...kffff', '...kfkff', '...kffff', '....khhh',
      '..kggxxx', '.kggxxxx', '.kggkhhh', '.kfgxxxx', '.kkgxxxx', '...khhhh', '...khk..', '...kkk..',
    ] },
    wolf: { h: [
      '........', '..kk....', '..kdk...', '..kddkkk', '..kddddd', '.kdddddd', '.kddykdd', '.kdddddd',
      '..kddsss', '...kdssk', '....kssr', '.....kkk', '...kdsss', '...kdsss', '...kdk..', '...kk...',
    ] },
    lion: { h: [
      '........', '...kkkkk', '..khhhhh', '.khhhhhh', 'khhkqqqq', 'khkqqqqq', 'khkqwkqq', 'khkqqqqq',
      'khkqqxxk', 'khhkqxxx', '.khhkkxx', '..khhkkk', '...khhhh', '....kkkk', '........', '........',
    ] },
    bear: { h: [
      '........', '..kk....', '.khhk.kk', '.khuhkhh', '..khhhhh', '..khhhhh', '.khhwkhh', '.khhhhhh',
      '.khhhxxx', '..khxxxk', '...khxxx', '..kkhhhh', '.khhhhhh', '.khhhxxx', '.khhkxxx', '.kkkkkkk',
    ] },
    boar: { h: [
      '........', '........', '..kk....', '..khk.kk', '..khhkhh', '.khhhhhh', '.khhrkhh', '.khhhhhh',
      'kwkhhiii', '.wkhikii', '..khhiii', '...khhhh', '..khhhhh', '..khk...', '..kk....', '........',
    ] },
    dino: { h: [
      '........', '...kkkkk', '..kggggg', '.kgggggg', '.kgykggg', '.kgggggg', '.kgggggg', 'kgggkkkk',
      'kgkwkwkw', 'kgkrrrrr', 'kgkwkwkw', '.kgkkkkk', '..kggggg', '..kglgll', '...kglll', '...kkkkk',
    ] },
    sheep: { h: [
      '........', '........', '....kkkk', '...kwwww', '..kwwwww', '.kwwkeee', '.kwkewee', '.kwkeeee',
      '.kwwkeei', '.kwwwkkk', '.kwwwwww', '.kwwwwww', '..kwwwww', '...kek..', '...kk...', '........',
    ] },
    bird: { h: [
      '........', '........', '.....kkk', '....keee', '...keeee', '...keyke', '...keeeo', '...kkeoo',
      'kk.keeee', 'kekkeeee', 'keeekeee', '.keeekee', '..keeeke', '...keeee', '....ko..', '........',
    ] },
    yeti: { h: [
      '........', '....kkkk', '...kwwww', '..kwwwww', '..kwwccc', '..kwckcc', '..kwcccc', '..kwcwkk',
      '..kwwwww', '.kkwwwww', 'kwwkwwww', 'kwwkwwww', 'kckkwwww', 'kk.kwwww', '...kwwk.', '...kkkk.',
    ] },
    scarecrow: { h: [
      '........', '....kkkk', '...khhhh', '.kkkkkkk', '...kxxxx', '...kxkxx', '...kxxxx', '...kxkxk',
      '....kkkk', 'yyykgggg', '...kgggg', '...kgrgg', '......kh', '......kh', '......kh', '......kk',
    ] },

    // ---------------- spell / item icons ----------------
    fireball: { h: [
      '........', '...k...k', '..kyk.ky', '..kyykyo', '.kyoyyoo', '.kyoooro', 'kyoorrrr', 'kyorryww',
      'kyorryww', 'kyorrrrr', '.kyorrrr', '.kyoorrr', '..kyooor', '...kkyoo', '.....kkk', '........',
    ] },
    frostbolt: { h: [
      '.......k', '......ka', '.....kaw', '.....kaw', '....kcaw', '....kcaw', '...kccaw', '...kbcaw',
      '..kbbcaw', '..kbbcca', '...kbbcc', '....kbbc', '.....kbb', '......kb', '.......k', '........',
    ] },
    missiles: { f: [
      '................',
      '..........kk....',
      '.........kzzk...',
      '........kzwzk...',
      '........kzzk....',
      '...kk....kk.....',
      '..kzzk..........',
      '..kzwzk.....kk..',
      '...kzzk....kzzk.',
      '....kk....kzwzk.',
      '..........kzzk..',
      '.....kk....kk...',
      '....kzzk........',
      '....kzwzk.......',
      '.....kzzk.......',
      '......kk........',
    ] },
    book: { h: [
      '........', '..z.....', '......z.', '..kkkk..', '.kwwwwkk', '.kwddwwk', '.kwwwwwk', '.kwdddwk',
      '.kwwwwwk', '.kwddwwk', '.kwwwwwk', '.kbbbbbk', '.kkkkkkb', '.......k', '........', '........',
    ] },
    snowflake: { h: [
      '........', '.......w', '.....a.w', '......aw', '..a....w', '...a...w', '....a.aw', 'wwwwwwww',
      'wwwwwwww', '....a.aw', '...a...w', '..a....w', '......aw', '.....a.w', '.......w', '........',
    ] },
    inferno: { h: [
      '...y....', '...y..y.', '..yoy.yo', '..yoy.yo', '.yooyyoo', '.yorooro', 'yoorrorr', 'yorrrrrr',
      'yorrmrrm', 'yormmmrm', 'yormmmmm', '.yrmmmmm', '.kkkkkkk', '.keeeeee', '.kkkkkkk', '........',
    ] },
    axe: { f: [
      '................',
      '........kkk.....',
      '.......kssskk...',
      '......ksswssk...',
      '......kswwsssk..',
      '.......kkssssk..',
      '........khkssk..',
      '.......khk.kk...',
      '......khk.......',
      '.....khk........',
      '....khk.........',
      '...khk..........',
      '..khk...........',
      '.kuk............',
      '.kk.............',
      '................',
    ] },
    skull: { h: [
      '........', '....kkkk', '...kwwww', '..kwwwww', '..kwwwww', '..kwkkkw', '..kwkkkw', '..kwwwwk',
      '...kwwww', '....kwkw', '....kkkk', '........', '..r.....', '...r....', '....r...', '........',
    ] },
    tornado: { h: [
      '........', '..kkkkkk', '.kswwwww', '..kkkkkk', '...kkkkk', '...kswww', '....kkkk', '....kkkk',
      '....ksww', '.....kkk', '.....kkk', '.....ksw', '......kk', '......kk', '.......k', '........',
    ] },
    shield: { h: [
      '........', '..kkkkkk', '.kssssss', '.ksrrrrr', '.ksrrrrr', '.ksrrrry', '.ksrryyy', '.ksrrrry',
      '.ksrrrry', '..ksrrrr', '..ksrrrr', '...ksrrr', '....ksrr', '.....ksr', '......kk', '........',
    ] },
    swords: { h: [
      '........', 'kk......', 'kwk.....', '.kwk....', '..kwk...', '...kwk..', '....kwk.', '.....kwk',
      '......kw', '....kqkk', '...khk..', '..khk...', '.kqk....', '.kk.....', '........', '........',
    ] },
    sword: { h: [
      '.......k', '......kw', '..y...kw', '......kw', '......kw', '.y....kw', '......kw', '......kw',
      '......kw', '...kqqqq', '......kh', '......kh', '......kh', '.....kqq', '......kk', '........',
    ] },
    holy: { h: [
      '........', '.......y', '..y....y', '...y...y', '....y.yw', '.....yww', '....ywww', 'yyyyywww',
      'yyyyywww', '....ywww', '.....yww', '....y.yw', '...y...y', '..y....y', '.......y', '........',
    ] },
    scales: { h: [
      '........', '........', '......kk', '.kkkkkky', '.kyyyyyy', '.kkkkkky', '.k.k..ky', 'k...k.ky',
      'kkkkk.ky', '.kyyk.ky', '..kk..ky', '......ky', '....kkky', '...kyyyy', '...kkkkk', '........',
    ] },
    crown: { h: [
      '........', '......y.', '........', '.k....kk', 'kyk..kyy', 'kyyk.kyy', 'kyyykyyy', 'kyyyyyyy',
      'kyyryybb', 'kyyyyyyy', 'kqqqqqqq', 'kkkkkkkk', '........', '...y....', '........', '........',
    ] },
    hammer: { h: [
      '........', '..kkkkkk', '.kswssss', '.kssssss', '.kdddddd', '.kkkkkkk', '......kh', '......kh',
      '......kh', '......kh', '......kh', '......kh', '......kh', '......kh', '......kk', '........',
    ] },
    arrow: { f: [
      '................',
      '...........kkk..',
      '..........kwwk..',
      '.........kwwsk..',
      '........kwwsk...',
      '.......khskk....',
      '......khk.......',
      '.....khk........',
      '....khk.........',
      '...khk..........',
      '.kkhk...........',
      'kgkk............',
      'kggk............',
      '.kgk............',
      '..k.............',
      '................',
    ] },
    bow: { f: [
      '................',
      '.......kk.......',
      '......khhk......',
      '......kkhhk.....',
      '.......wkhk.....',
      '.......w.khk....',
      '.......w.khk....',
      '.......w..kqk...',
      '.......w..kqk...',
      '.......w.khk....',
      '.......w.khk....',
      '.......wkhk.....',
      '......kkhhk.....',
      '......khhk......',
      '.......kk.......',
      '................',
    ] },
    paw: { h: [
      '........', '........', '.....kk.', '.kk.khhk', 'khhkkhhk', 'khhk.kk.', '.kk.....', '...kkkkk',
      '..khhhhh', '.khhhhhh', '.khhhhhh', '.khhhhhh', '..khhhhh', '...kkkkk', '........', '........',
    ] },
    coin: { h: [
      '........', '........', '.....kkk', '...kkyyy', '..kyywyy', '..kywyyy', '.kyyyyqq', '.kyyyqyy',
      '.kyyyqyy', '.kyyyyqq', '..kyyyyy', '..kqyyyy', '...kkqqq', '.....kkk', '........', '........',
    ] },

    // ---------------- heroes (24x24) ----------------
    hero_mage: { h: [
      '............', '..........kk', '.........kbb', '........kbbb', '.......kbbbb', '......kbbbby',
      '.....kbbbbbb', '....kbbbbbbb', '..kkkkkkkkkk', '.knbbbbbbbbb', '..kkkyyyyyyy', '...kyyffffff',
      '...kyffwkfff', '...kyfffffff', '...kyyfiffff', '...kyyfffffk', '...kyyyfffff', '..kyyykfffff',
      '.kyykbbbbbbb', 'kbbbbbbbbbby', 'kbbbbbbbbbqy', 'kbbbbbbbbbby', 'kbbbbbbbbbby', 'kkkkkkkkkkkk',
    ] },
    hero_warrior: { h: [
      '............', '.k..........', 'kwk.........', 'kwwk........', '.kwwk..kkkkk', '..kwwkksssss',
      '...kkssswsss', '....ksssssss', '....kddddddd', '....kdddkddd', '....kkkkkkkk', '....kfkkkfff',
      '....kffwkfff', '....kfffffff', '....kffffffh', '....kuufffff', '....kuuuukkk', '....kuuuuuuu',
      '...kkkuuuuuu', '.krrrrkkuuuu', 'krrksssssddd', 'krrkssdsssdd', 'krrksssssddd', 'kkkkkkkkkkkk',
    ] },
    hero_paladin: { h: [
      '..........kk', '.........kww', '........kwww', '......kkkkkk', '.....kqqqqqq', '....kqqyqqqq',
      '...kqqyqqqqq', '...kqqqqqqqq', '...kqqkkkkkk', '...kqkffffff', '...kqkfwkfff', '...kqkffffff',
      '...kqkfffffh', '...kqkffffff', '...kqkfffffk', '...kqqkfffff', '....kqqkkkkk', '..kkkqqqqqqq',
      '.kqqqqkwwwww', 'kqqqqqkwwwwy', 'kqqqqqkwyyyy', 'kqqqqqkwwwwy', 'kqqqqqkwwwwy', 'kkkkkkkkkkkk',
    ] },
    hero_hunter: { h: [
      '............', '........kkkk', '......kkgggg', '.....kgggggg', '....kggggggg', '...kgggvgggg',
      '...kggvkkkkk', '..kggvkhhhhh', '..kggkhhffff', '..kgkhffffff', '..kgkffwkfff', '..kgkfffffff',
      '..kgkfffffff', '..kgkfffffff', '..kggkffffff', '...kgggkkkkk', '..kggggvvvvv', '.kgggkhhhhhh',
      '.kgggkhhxhhh', 'kgggkhhhxhhh', 'kgggkhhhhxhh', 'kgggkhhhhhxh', 'kgggkhhhhhhx', 'kkkkkkkkkkkk',
    ] },
  };

  // Palette-swapped variants.
  const VARIANTS = {
    lootgoblin: ['goblin', { g: 'l', h: 'q' }],
    bloodbat: ['bat', { p: 'r', y: 'w' }],
    nightblade: ['rogue', { e: 'p', a: 'r' }],
    waterelem: ['elemental', { y: 'a', o: 'c', r: 'b' }],
    guard: ['knight', { r: 'b', y: 'b', w: 'd' }],
    champion: ['knight', { r: 'o', y: 'r', s: 'x', d: 'h' }],
    paladin: ['knight', { s: 'q', d: 'h', r: 'w' }],
    crownguard: ['knight', { s: 'y', d: 'q', r: 'b' }],
    shieldbearer: ['squire', { b: 'r', y: 'w' }],
    recruit: ['squire', { b: 'd', y: 's' }],
    berserker: ['orc', { g: 'x', h: 'r', u: 'm' }],
    warchief: ['orc', { d: 'q', s: 'y' }],
    maiden: ['knight', { r: 'q', s: 'w', d: 's', y: 'r' }],
    panther: ['lion', { h: 'e', q: 'p', x: 'z' }],
    warlord: ['orc', { g: 'o', d: 'e', s: 'd', h: 'm', u: 'k', r: 'y' }],
    hound: ['wolf', { d: 'h', s: 'x' }],
    hyena: ['wolf', { d: 'x', s: 'y' }],
    hawk: ['bird', { e: 'h', o: 'y' }],
    pyro: ['fireball', { y: 'o', o: 'r', r: 'm', w: 'y' }],
    arcaneshot: ['arrow', { w: 'z', s: 'p', g: 'z' }],
    consecrate: ['holy', { y: 'q', w: 'y' }],
    blessing: ['sword', { w: 'y', y: 'w' }],
    wildpaw: ['paw', { h: 'g' }],
    killpaw: ['paw', { h: 'r' }],
    execute: ['skull', { r: 'r' }],
    shieldslam: ['shield', { r: 'd', y: 's' }],
    armor: ['shield', { r: 'd', y: 's' }],
    healpaw: ['holy', {}],
    harvest: ['scarecrow', {}],
    frostnova: ['snowflake', {}],
  };

  function rowsOf(def) {
    if (def.f) return def.f.map((r) => r.padEnd(16, '.').slice(0, 16));
    return def.h.map((r) => { const w = def.h[0].length; const half = r.padEnd(w, '.').slice(0, w); return half + [...half].reverse().join(''); });
  }

  function resolve(name) {
    if (S[name]) return { rows: rowsOf(S[name]), swap: null };
    const v = VARIANTS[name];
    if (v) return { rows: rowsOf(S[v[0]]), swap: v[1] };
    return null;
  }

  const cache = {};
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // mode: 'n' normal, 'w' white silhouette, 'k' dark silhouette
  function get(name, mode = 'n') {
    const key = name + ':' + mode;
    if (cache[key]) return cache[key];
    const r = resolve(name) || resolve('slime');
    const rows = r.rows;
    const h = rows.length, w = rows[0].length;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        if (r.swap && r.swap[ch]) ch = r.swap[ch];
        ctx.fillStyle = mode === 'w' ? '#ffffff' : mode === 'k' ? '#1a1c2c' : (PAL[ch] || '#ff00ff');
        ctx.fillRect(x, y, 1, 1);
      }
    }
    cache[key] = c;
    return c;
  }

  function names() { return Object.keys(S).concat(Object.keys(VARIANTS)); }

  root.Sprites = { PAL, get, names, resolve, raw: S };
})(typeof window !== 'undefined' ? window : globalThis);
