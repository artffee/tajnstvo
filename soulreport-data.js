/* =========================================================
   TAJNSTVO — soul report interpretive data
   Hand-curated short prose per sign / life path / north node,
   keyed for the PDF's Big Three, Soul Mission, Wounds and
   Domains pages. Read by app.js at PDF-build time.
   ========================================================= */

(function () {
  'use strict';

  // Per-sign short interpretive lines, by category.
  // Categories used:
  //   sun       — Big Three: solar identity
  //   moon      — Big Three: lunar emotional weather
  //   rising    — Big Three: ascendant / outward presentation
  //   wounds    — Greatest wounds register (anchored to Saturn sign)
  //   love      — Relationships register (anchored to Venus sign)
  //   career    — Career register (anchored to MC sign)
  //   money     — Finances register (anchored to Jupiter sign)
  const SIGN_TEXTS = {
    Ari: {
      sun:    'Selfhood forged through initiation. You begin where others wait, often before you know why.',
      moon:   'Feelings flash bright and quick. Stillness has to be practiced; sitting with what arrives is the work.',
      rising: 'Strangers read you as front-facing and immediate. The chart wears its will outward.',
      wounds: 'Being too much, too sharp, too soon. The work is owning the edge without apology.',
      love:   'You arrive declaratively. The depth comes only when you remain past the spark.',
      career: 'Leadership and first moves are your terrain. Finishing is the discipline you grow into.',
      money:  'Income flows through initiative — openings, campaigns, first-mover positions. Patience is the lesson.',
    },
    Tau: {
      sun:    'Selfhood is built slowly, by what you keep. You become real to yourself through the tangible.',
      moon:   'You need physical anchors to feel — soft fabric, weight under foot, money in the account.',
      rising: 'The room reads you as steady and embodied. Strangers underestimate how immovable you are.',
      wounds: 'A wound around safety and deserving. Tangible loss cut deep early.',
      love:   'Love must arrive slowly and stay. Reliability and sense-pleasure are your language.',
      career: 'Patient mastery, beautiful objects, sustained craft. You build arcs longer than louder people.',
      money:  'Wealth accumulates by holding, not chasing. Compounding is your wealth strategy by nature.',
    },
    Gem: {
      sun:    'Selfhood is multiple. You become yourself by translating between worlds.',
      moon:   'Feelings need words to land. Until named they remain electric and unsorted.',
      rising: 'You read as quick, conversational, hard to fix. People meet you in language first.',
      wounds: 'Being treated as light when you were carrying weight. The wound is in the unnamed.',
      love:   'You love through dialogue. Without the conversation the connection thins.',
      career: 'Writing, teaching, brokering, networks. You make value through fluent translation.',
      money:  'Money moves through information and routes. Multiple streams suit you better than one trunk.',
    },
    Can: {
      sun:    'Selfhood is rooted in care. You discover yourself through what and whom you protect.',
      moon:   'You feel deeply, privately, and earlier than the room. The interior is your first home.',
      rising: 'The world reads you as soft-edged, careful, watchful. People feel held in your presence.',
      wounds: 'A mother wound or home wound. The work is parenting yourself the way you needed.',
      love:   'You love through tending. Be careful not to mistake feeding others for being seen by them.',
      career: 'Care work, food, family, healing, real estate. You succeed where the heart is at stake.',
      money:  'Money moves through home and lineage. Saving comes naturally; spending requires permission.',
    },
    Leo: {
      sun:    'Selfhood is theatrical. You become real to yourself by being witnessed in your full size.',
      moon:   'You feel through dignity and warmth. Slights to honor cut deeper than other wounds.',
      rising: 'Rooms turn slightly when you enter. The chart wears authorship outward.',
      wounds: 'Being made small, ignored, or overshadowed early. The work is taking up the room you were born for.',
      love:   'You love generously and need to be seen loving. Devotion is real; performance can mask it.',
      career: 'Centre-stage roles. Creative direction. You succeed where you can sign your name.',
      money:  'Money flows where you are visibly creating. Underearning often comes from hiding.',
    },
    Vir: {
      sun:    'Selfhood through service and craft. You become yourself by the precision of what you do.',
      moon:   'Feelings come sorted by usefulness. Letting them be unproductive is the inner practice.',
      rising: 'You read as careful, observant, slightly held back. The chart watches before it speaks.',
      wounds: 'A wound around being not enough yet. Perfectionism was a survival strategy.',
      love:   'You love through care, calibration, attention to detail. Receiving without earning is the lesson.',
      career: 'Editing, healing, systems, fine work. Your specific gift is the corrective eye.',
      money:  'Money rewards meticulousness. Underearning often hides in over-preparing.',
    },
    Lib: {
      sun:    'Selfhood through relationship. You meet yourself in the mirror of the other.',
      moon:   'You feel in dynamics. The mood of the room registers before your own.',
      rising: 'Strangers read you as gracious and well-arranged. The chart is socially attuned by default.',
      wounds: 'A wound around fairness and being chosen. Self-erasure for harmony was the early habit.',
      love:   'Love is your art form. Watch the impulse to keep the peace at the cost of the truth.',
      career: 'Mediation, design, partnership, law, aesthetics. You create through balance and contrast.',
      money:  'Income flows through partnership and beauty. Solo income often requires deliberate practice.',
    },
    Sco: {
      sun:    'Selfhood through intensity. You become real where most people turn away.',
      moon:   'You feel in undercurrents. Surface emotions are not the real message.',
      rising: 'The room senses depth before it sees you. Privacy is part of your magnetism.',
      wounds: 'A wound around betrayal and trust. The work is letting in without first testing.',
      love:   'You love totally or not at all. Half-measures cost you more than they save.',
      career: 'Investigation, transformation, depth psychology, finance, surgery. You work where stakes are real.',
      money:  'Money flows through other people\'s resources — investments, inheritances, joint ventures.',
    },
    Sag: {
      sun:    'Selfhood through expansion. You become yourself by going further than was expected.',
      moon:   'Feelings need horizon. Confinement contracts the inner life faster than other charts.',
      rising: 'You read as buoyant, curious, philosophical. The chart wears its faith outward.',
      wounds: 'A wound around freedom and meaning. Being told to be smaller hurt more than being told no.',
      love:   'You love by sharing the road. Domestication without horizon dims you.',
      career: 'Teaching, publishing, foreign work, ideas. You succeed where the frame is bigger than you.',
      money:  'Income comes through belief and reach. Speculation is a temptation to manage.',
    },
    Cap: {
      sun:    'Selfhood through structure. You become yourself by what you build over time.',
      moon:   'Feelings move slowly and want to be useful. Permission to feel without solving is the practice.',
      rising: 'The room reads you as composed, deliberate, slightly older than you are.',
      wounds: 'A wound around authority and worth. The work is letting in support before earning it.',
      love:   'You love steadily, durably, with a long planning horizon. Spontaneity has to be invited.',
      career: 'Long-form mastery. Institutions, tradition, mountain-climbing careers. You age into your power.',
      money:  'Money rewards discipline and patience. Wealth typically arrives later and more reliably.',
    },
    Aqu: {
      sun:    'Selfhood through difference. You meet yourself in what no one else around you sees yet.',
      moon:   'You feel through ideas and groups. Personal feelings can lag behind systemic ones.',
      rising: 'The room reads you as cool, original, slightly outside. Approachable but not legible at first pass.',
      wounds: 'A wound around belonging. The work is being among others without dissolving into them.',
      love:   'You love intellectually and unconventionally. Routine domesticity needs reframing to fit you.',
      career: 'Innovation, technology, networks, future-facing work. You succeed where the field is being made.',
      money:  'Money flows through scale and groups. Solo trade-of-hours work tends to feel like cage.',
    },
    Pis: {
      sun:    'Selfhood through dissolution. You become yourself by remembering you were never only yourself.',
      moon:   'You feel everything, your own and not. Energetic boundaries are the central practice.',
      rising: 'You read as dreamy, soft-edged, hard to define. The chart receives more than it transmits.',
      wounds: 'A wound around boundaries and being too porous. Escapism is the shadow.',
      love:   'You love compassionately, sometimes past your own protection. Discernment is the work.',
      career: 'Art, healing, music, contemplative work. You succeed where the literal is not the point.',
      money:  'Money requires structure to land in this chart. Without discipline it slips through.',
    },
  };

  // Life Path 1-9 + master numbers 11/22/33
  const LIFE_PATH = {
    1:  { name: 'The Pioneer',        line: 'Independence, originality, the will to begin. You are here to walk an unborrowed path.' },
    2:  { name: 'The Diplomat',       line: 'Relationship, harmony, the gift of being-with. You evolve through partnership and gentleness.' },
    3:  { name: 'The Communicator',   line: 'Expression, creativity, joy. Your voice is the instrument; using it is the work.' },
    4:  { name: 'The Builder',        line: 'Discipline, structure, slow construction. You are here to make what stays.' },
    5:  { name: 'The Adventurer',     line: 'Freedom, change, the senses. You learn by moving and by saying yes to what is unfamiliar.' },
    6:  { name: 'The Nurturer',       line: 'Care, responsibility, beauty. Home and family are central; balance against martyrdom is the practice.' },
    7:  { name: 'The Seeker',         line: 'Inwardness, study, the unseen. You evolve through silence, research, and direct experience of the sacred.' },
    8:  { name: 'The Achiever',       line: 'Power, money, mastery in the visible world. Your task is to wield resources without losing the soul.' },
    9:  { name: 'The Humanitarian',   line: 'Service, completion, the wider human field. You are the elder of your generation, asked to give without keeping score.' },
    11: { name: 'The Inspired Visionary', line: 'A master frequency of intuition and inspiration. You are here to channel and uplift; the nervous system needs careful tending.' },
    22: { name: 'The Master Builder', line: 'A master frequency of vision-into-form. You are here to construct something that outlasts you.' },
    33: { name: 'The Master Teacher', line: 'A master frequency of compassionate service. You are here to teach by what you live, not what you say.' },
  };

  // North Node by sign — the soul's evolutionary direction.
  const NORTH_NODE = {
    Ari: 'Toward independent self-direction. The soul is learning to act before consensus.',
    Tau: 'Toward grounded presence and self-worth. The soul is learning to be still and to receive.',
    Gem: 'Toward curiosity and the local. The soul is learning to ask, not pronounce.',
    Can: 'Toward emotional availability and home. The soul is learning the courage of softness.',
    Leo: 'Toward visible self-expression. The soul is learning to be authored, not anonymous.',
    Vir: 'Toward useful service and discernment. The soul is learning to refine the gift through practice.',
    Lib: 'Toward partnership and balance. The soul is learning to share authorship of life.',
    Sco: 'Toward depth and merging. The soul is learning to surrender what cannot be controlled.',
    Sag: 'Toward meaning and the larger view. The soul is learning to trust the longer arc.',
    Cap: 'Toward responsibility and earned authority. The soul is learning to mature into mastery.',
    Aqu: 'Toward originality and the collective. The soul is learning to belong to a wider community than the family.',
    Pis: 'Toward surrender and the unseen. The soul is learning to release the need to manage everything.',
  };

  // Three-phase framework borrowed from coaching traditions.
  // Used as the structural arc of the soul-report pages.
  const PHASES = {
    activation:    'What is surfacing now and asking to be lived.',
    transmutation: 'What is asking to be released, refined, or grieved.',
    integration:   'What life looks like when the energy is embodied and steady.',
  };

  // Numerology — meaning of each reduced number (1-9 + masters 11/22/33).
  // Shared across all positions; the position framing (below) gives the lens.
  const NUMBER_MEANINGS = {
    1:  { title: 'The Leader',        text: 'Independent, pioneering, self-starting — the number of initiative and the will to go first. You are built to originate rather than follow. Its shadow is domination, or the loneliness of always being out front.' },
    2:  { title: 'The Diplomat',      text: 'Sensitive, cooperative, deeply attuned to others — the number of partnership and peace-making. You read a room before you enter it. Its shadow is self-erasure and over-dependence on being needed.' },
    3:  { title: 'The Communicator',  text: 'Expressive, creative, joyful — the number of the voice, art, and delight. You are here to be heard and to lift the mood of the room. Its shadow is scattering your gift across too many things at once.' },
    4:  { title: 'The Builder',       text: 'Disciplined, practical, steady — the number of foundations and honest work. You make things that last because you do the unglamorous parts. Its shadow is rigidity, and mistaking the grind for the point.' },
    5:  { title: 'The Adventurer',    text: 'Free, curious, sensual — the number of change, travel, and the five senses. You learn by moving and by saying yes to the unfamiliar. Its shadow is restlessness and excess that never lets a thing root.' },
    6:  { title: 'The Nurturer',      text: 'Responsible, loving, aesthetic — the number of home, family, and beauty. You hold other people together, often by instinct. Its shadow is martyrdom, and control disguised as care.' },
    7:  { title: 'The Seeker',        text: 'Analytical, spiritual, inward — the number of study, solitude, and the unseen. You go deep where others stay on the surface. Its shadow is withdrawal, and a mistrust that keeps the world at arm’s length.' },
    8:  { title: 'The Achiever',      text: 'Ambitious, capable, material — the number of power, money, and mastery in the visible world. You are built to wield resources at scale. Its shadow is workaholism, and letting the empire eat the soul.' },
    9:  { title: 'The Humanitarian',  text: 'Compassionate, wise, completing — the number of service and the wider human field. You are an old soul asked to give without keeping score. Its shadow is self-sacrifice, and an aloofness that never lets anyone close.' },
    11: { title: 'The Visionary',     text: 'A master frequency: intuitive, inspired, electric — a high-voltage channel for insight and inspiration. You sense what is coming before it arrives. Its shadow is a raw nervous system and anxiety that needs careful tending.' },
    22: { title: 'The Master Builder',text: 'A master frequency: vision made practical — the number that turns a dream into a structure that outlasts it. You can build at a scale most people only imagine. Its shadow is overwhelm under the weight of your own vision.' },
    33: { title: 'The Master Teacher',text: 'A master frequency: compassionate service raised to a calling — you teach by what you live, not what you say. Few carry this; fewer carry it cleanly. Its shadow is self-neglect in the name of everyone else.' },
  };

  // How each numerology position is derived + the lens it gives.
  const NUMBER_POSITIONS = {
    lifePath:    'From your full birth date — the road you are here to walk',
    birthday:    'From the day of the month you were born — a specific, ready-made talent',
    expression:  'From every letter of your name — your natural gifts and how you act',
    soulUrge:    'From the vowels of your name — what your heart quietly wants',
    personality: 'From the consonants — the version of you that others meet first',
  };

  // Per-planet archetypes — the heart of the deep-dive pages.
  // governs = caps subtitle; body = 2-3 sentence essence; shadow = one shadow line.
  const PLANET_ARCHETYPES = {
    sun: {
      name: 'The Sun', glyph: '☉', governs: 'IDENTITY · VITALITY · WILL',
      body: "The Sun is the core of the chart — the conscious self, the will to be, the thing that says 'I am' before anything qualifies it. Where the Sun sits is where you are most yourself, most alive, and most asked to shine on purpose.",
      shadow: 'Pride, or building a life around being seen rather than being true.',
    },
    moon: {
      name: 'The Moon', glyph: '☾', governs: 'EMOTION · INSTINCT · HOME',
      body: 'The Moon is your inner weather — the part of you that feels before it thinks, that needs, soothes, and remembers. It governs what makes you feel safe and how you care for yourself and the people you love.',
      shadow: 'Retreating into old comfort, or mistaking the familiar for the safe.',
    },
    mercury: {
      name: 'Mercury', glyph: '☿', governs: 'MIND · LANGUAGE · EXCHANGE',
      body: 'Mercury is how you think, speak, learn, and connect the dots. It rules the voice, the hands, and the daily traffic of ideas and information that runs through you.',
      shadow: 'Overthinking, or talking around a truth instead of through it.',
    },
    venus: {
      name: 'Venus', glyph: '♀', governs: 'LOVE · BEAUTY · VALUE',
      body: 'Venus is what you find beautiful and how you draw it near — love, pleasure, art, and the sense of what you are worth. It governs how you relate and what you reach for to feel full.',
      shadow: 'Pleasing to be loved, or confusing being wanted with being valued.',
    },
    mars: {
      name: 'Mars', glyph: '♂', governs: 'DRIVE · DESIRE · ACTION',
      body: 'Mars is your engine — how you assert, pursue, fight, and want. It governs anger, courage, and the way you move toward whatever you decide is yours.',
      shadow: 'Force where patience was needed, or anger turned inward as drift.',
    },
    jupiter: {
      name: 'Jupiter', glyph: '♃', governs: 'GROWTH · FAITH · ABUNDANCE',
      body: 'Jupiter is where life wants to expand you — through meaning, luck, generosity, and the belief that more is possible. It shows where you grow and where the world tends to open its doors.',
      shadow: 'Excess, over-promising, or faith untethered from the work.',
    },
    saturn: {
      name: 'Saturn', glyph: '♄', governs: 'STRUCTURE · TIME · MASTERY',
      body: 'Saturn is the teacher — limitation, discipline, and the slow earning of authority. It marks where life asks for patience, and where mastery, once built, becomes unshakeable.',
      shadow: 'Fear dressed as realism, or hardness where tenderness was the lesson.',
    },
    uranus: {
      name: 'Uranus', glyph: '♅', governs: 'FREEDOM · AWAKENING · DISRUPTION',
      body: 'Uranus is the lightning — where you break pattern, individuate, and refuse to be told. A slow generational planet, but in your chart it marks where you are most original and least willing to conform.',
      shadow: 'Rebellion for its own sake, or detachment that calls itself freedom.',
    },
    neptune: {
      name: 'Neptune', glyph: '♆', governs: 'DREAM · SPIRIT · DISSOLUTION',
      body: 'Neptune is the dissolving edge — imagination, compassion, and the longing for the infinite. A slow generational planet, but in your chart it marks where the boundaries thin and the sacred (or the illusory) leaks through.',
      shadow: 'Escape, idealisation, or losing yourself in the fog.',
    },
  };

  // Sign full names + element/modality (for composing planet-in-sign prose).
  const SIGN_FULL = {
    Ari:'Aries', Tau:'Taurus', Gem:'Gemini', Can:'Cancer', Leo:'Leo', Vir:'Virgo',
    Lib:'Libra', Sco:'Scorpio', Sag:'Sagittarius', Cap:'Capricorn', Aqu:'Aquarius', Pis:'Pisces',
  };
  const SIGN_ELEMENT = {
    Ari:'Fire', Leo:'Fire', Sag:'Fire', Tau:'Earth', Vir:'Earth', Cap:'Earth',
    Gem:'Air', Lib:'Air', Aqu:'Air', Can:'Water', Sco:'Water', Pis:'Water',
  };
  const SIGN_MODALITY = {
    Ari:'Cardinal', Can:'Cardinal', Lib:'Cardinal', Cap:'Cardinal',
    Tau:'Fixed', Leo:'Fixed', Sco:'Fixed', Aqu:'Fixed',
    Gem:'Mutable', Vir:'Mutable', Sag:'Mutable', Pis:'Mutable',
  };
  const ELEMENT_TONE = {
    Fire:  'expression is immediate, instinctive, and warm',
    Earth: 'expression is grounded, patient, and built to last',
    Air:   'expression is mental, social, and moves through ideas',
    Water: 'expression is feeling-led, intuitive, and runs deep',
  };
  const MODALITY_TONE = {
    Cardinal: 'it initiates — starting what others wait to be sure of',
    Fixed:    'it holds — sustaining and deepening once a course is set',
    Mutable:  'it adapts — bending and translating as conditions shift',
  };

  // Whole-sign house life-domains.
  const HOUSE_THEMES = {
    1:  'the self, the body, and the way you meet the world',
    2:  'money, possessions, and what you value and hold',
    3:  'mind, siblings, communication, and the near environment',
    4:  'home, roots, family, and the private interior',
    5:  'creativity, romance, play, and what you make for joy',
    6:  'work, health, routine, and daily service',
    7:  'partnership, marriage, and the significant other',
    8:  'intimacy, shared resources, and transformation',
    9:  'meaning, travel, higher study, and the larger view',
    10: 'career, reputation, and your public standing',
    11: 'friends, networks, hopes, and the collective',
    12: 'solitude, the unconscious, surrender, and what is hidden',
  };

  // Aspect interpretive lines (keyed to ASPECTS_DEFS names).
  const ASPECT_MEANINGS = {
    CONJ:    { label: 'conjunct',  line: 'two forces fused into one — they act together, for better and worse, and cannot be separated.' },
    SEXTILE: { label: 'sextile',   line: 'an open door — ease that becomes a gift only when you choose to use it.' },
    SQUARE:  { label: 'square',    line: 'a productive friction — these parts of you grow by being forced to work under tension.' },
    TRINE:   { label: 'trine',     line: 'a natural flow — a talent so easy it can be taken for granted.' },
    OPP:     { label: 'opposition',line: 'a pull between two poles — the work is balance, not the defeat of one side.' },
  };

  // Short essence used when a planet is named inside another section.
  const PLANET_FUNCTION = {
    sun: 'core will', moon: 'inner needs', mercury: 'thinking', venus: 'capacity to love',
    mars: 'drive', jupiter: 'sense of possibility', saturn: 'discipline',
    uranus: 'need for freedom', neptune: 'imagination',
  };

  window.tajnstvoSoulData = {
    SIGN_TEXTS, LIFE_PATH, NORTH_NODE, PHASES, NUMBER_MEANINGS, NUMBER_POSITIONS,
    PLANET_ARCHETYPES, SIGN_FULL, SIGN_ELEMENT, SIGN_MODALITY, ELEMENT_TONE,
    MODALITY_TONE, HOUSE_THEMES, ASPECT_MEANINGS, PLANET_FUNCTION,
  };
})();
