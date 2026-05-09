/* =========================================================
   TAJNSTVO — celestial star map generator
   A4 portrait poster: cream parchment, dark sky disc,
   real stars projected from observer's birth moment.
   ========================================================= */

(function () {
  'use strict';

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  /* ---------- bright star catalogue (ra hours, dec degrees, magnitude) ---------- */
  const NAMED_STARS = {
    'Sirius':       { ra: 6.7525,  dec: -16.7164, mag: -1.46 },
    'Canopus':      { ra: 6.3992,  dec: -52.6957, mag: -0.74 },
    'Arcturus':     { ra: 14.2610, dec:  19.1825, mag: -0.05 },
    'Vega':         { ra: 18.6157, dec:  38.7837, mag:  0.03 },
    'Capella':      { ra:  5.2782, dec:  45.9980, mag:  0.08 },
    'Rigel':        { ra:  5.2423, dec:  -8.2017, mag:  0.13 },
    'Procyon':      { ra:  7.6550, dec:   5.2250, mag:  0.34 },
    'Achernar':     { ra:  1.6286, dec: -57.2367, mag:  0.46 },
    'Betelgeuse':   { ra:  5.9195, dec:   7.4071, mag:  0.50 },
    'Hadar':        { ra: 14.0637, dec: -60.3730, mag:  0.61 },
    'Altair':       { ra: 19.8463, dec:   8.8683, mag:  0.77 },
    'Acrux':        { ra: 12.4433, dec: -63.0991, mag:  0.77 },
    'Aldebaran':    { ra:  4.5987, dec:  16.5093, mag:  0.85 },
    'Spica':        { ra: 13.4199, dec: -11.1614, mag:  0.97 },
    'Antares':      { ra: 16.4901, dec: -26.4320, mag:  1.09 },
    'Pollux':       { ra:  7.7553, dec:  28.0262, mag:  1.14 },
    'Fomalhaut':    { ra: 22.9608, dec: -29.6222, mag:  1.16 },
    'Deneb':        { ra: 20.6905, dec:  45.2803, mag:  1.25 },
    'Mimosa':       { ra: 12.7953, dec: -59.6886, mag:  1.25 },
    'Regulus':      { ra: 10.1395, dec:  11.9672, mag:  1.35 },
    'Adhara':       { ra:  6.9770, dec: -28.9722, mag:  1.50 },
    'Castor':       { ra:  7.5764, dec:  31.8884, mag:  1.57 },
    'Gacrux':       { ra: 12.5194, dec: -57.1131, mag:  1.63 },
    'Shaula':       { ra: 17.5601, dec: -37.1038, mag:  1.62 },
    'Bellatrix':    { ra:  5.4188, dec:   6.3497, mag:  1.64 },
    'Elnath':       { ra:  5.4382, dec:  28.6075, mag:  1.65 },
    'Alnilam':      { ra:  5.6036, dec:  -1.2019, mag:  1.69 },
    'Alnitak':      { ra:  5.6793, dec:  -1.9426, mag:  1.74 },
    'Alioth':       { ra: 12.9005, dec:  55.9598, mag:  1.76 },
    'Dubhe':        { ra: 11.0621, dec:  61.7510, mag:  1.79 },
    'Mirfak':       { ra:  3.4054, dec:  49.8612, mag:  1.79 },
    'Wezen':        { ra:  7.1399, dec: -26.3933, mag:  1.84 },
    'Kaus Aus':     { ra: 18.4029, dec: -34.3847, mag:  1.85 },
    'Alkaid':       { ra: 13.7923, dec:  49.3133, mag:  1.86 },
    'Sargas':       { ra: 17.6217, dec: -42.9978, mag:  1.86 },
    'Menkalinan':   { ra:  5.9920, dec:  44.9474, mag:  1.90 },
    'Atria':        { ra: 16.8111, dec: -69.0277, mag:  1.91 },
    'Alhena':       { ra:  6.6286, dec:  16.3993, mag:  1.93 },
    'Polaris':      { ra:  2.5301, dec:  89.2641, mag:  1.97 },
    'Mirzam':       { ra:  6.3783, dec: -17.9559, mag:  1.98 },
    'Alphard':      { ra:  9.4595, dec:  -8.6586, mag:  2.00 },
    'Hamal':        { ra:  2.1196, dec:  23.4624, mag:  2.00 },
    'Algieba':      { ra: 10.3328, dec:  19.8415, mag:  2.01 },
    'Diphda':       { ra:  0.7264, dec: -17.9866, mag:  2.04 },
    'Mizar':        { ra: 13.3987, dec:  54.9254, mag:  2.04 },
    'Alpheratz':    { ra:  0.1398, dec:  29.0905, mag:  2.06 },
    'Saiph':        { ra:  5.7960, dec:  -9.6697, mag:  2.06 },
    'Mirach':       { ra:  1.1622, dec:  35.6206, mag:  2.05 },
    'Almach':       { ra:  2.0649, dec:  42.3296, mag:  2.10 },
    'Algol':        { ra:  3.1361, dec:  40.9556, mag:  2.12 },
    'Denebola':     { ra: 11.8177, dec:  14.5721, mag:  2.14 },
    'Sadr':         { ra: 20.3705, dec:  40.2567, mag:  2.20 },
    'Mintaka':      { ra:  5.5334, dec:  -0.2991, mag:  2.23 },
    'Schedar':      { ra:  0.6751, dec:  56.5373, mag:  2.24 },
    'Caph':         { ra:  0.1530, dec:  59.1498, mag:  2.27 },
    'Gienah Cyg':   { ra: 20.7702, dec:  33.9700, mag:  2.46 },
    'Navi':         { ra:  0.9451, dec:  60.7167, mag:  2.47 },
    'Markab':       { ra: 23.0793, dec:  15.2052, mag:  2.49 },
    'Scheat':       { ra: 23.0628, dec:  28.0828, mag:  2.42 },
    'Algenib':      { ra:  0.2206, dec:  15.1836, mag:  2.83 },
    'Zosma':        { ra: 11.2351, dec:  20.5237, mag:  2.56 },
    'Kaus Bor':     { ra: 18.4661, dec: -25.4217, mag:  2.81 },
    'Kaus Med':     { ra: 18.3500, dec: -29.8281, mag:  2.72 },
    'Nunki':        { ra: 18.9211, dec: -26.2967, mag:  2.05 },
    'Ruchbah':      { ra:  1.4302, dec:  60.2353, mag:  2.68 },
    'Albireo':      { ra: 19.5121, dec:  27.9597, mag:  3.18 },
    'Sulafat':      { ra: 18.9821, dec:  32.6896, mag:  3.24 },
    'Sheliak':      { ra: 18.8347, dec:  33.3627, mag:  3.45 },
    'Megrez':       { ra: 12.2572, dec:  57.0326, mag:  3.31 },
    'Phecda':       { ra: 11.8972, dec:  53.6948, mag:  2.44 },
    'Merak':        { ra: 11.0307, dec:  56.3825, mag:  2.37 },
    'Chort':        { ra: 11.2371, dec:  15.4296, mag:  3.34 },
    'Segin':        { ra:  1.9067, dec:  63.6701, mag:  3.38 },
    'Delta Cyg':    { ra: 19.7494, dec:  45.1308, mag:  2.87 },
    'Delta Lyr':    { ra: 18.8810, dec:  36.8990, mag:  4.30 },
  };

  /* ---------- constellation line patterns ---------- */
  const CONSTELLATIONS = [
    { name: 'Orion', lines: [
      ['Betelgeuse','Bellatrix'], ['Bellatrix','Mintaka'],
      ['Mintaka','Alnilam'], ['Alnilam','Alnitak'], ['Alnitak','Saiph'],
      ['Saiph','Rigel'], ['Rigel','Mintaka'], ['Betelgeuse','Alnitak'],
    ]},
    { name: 'Big Dipper', lines: [
      ['Dubhe','Merak'], ['Merak','Phecda'], ['Phecda','Megrez'], ['Megrez','Dubhe'],
      ['Megrez','Alioth'], ['Alioth','Mizar'], ['Mizar','Alkaid'],
    ]},
    { name: 'Cassiopeia', lines: [
      ['Caph','Schedar'], ['Schedar','Navi'], ['Navi','Ruchbah'], ['Ruchbah','Segin'],
    ]},
    { name: 'Lyra', lines: [
      ['Vega','Sheliak'], ['Vega','Delta Lyr'],
      ['Sheliak','Sulafat'], ['Sulafat','Delta Lyr'],
    ]},
    { name: 'Cygnus', lines: [
      ['Deneb','Sadr'], ['Sadr','Albireo'],
      ['Sadr','Gienah Cyg'], ['Sadr','Delta Cyg'],
    ]},
    { name: 'Leo', lines: [
      ['Regulus','Algieba'], ['Algieba','Zosma'], ['Zosma','Denebola'],
      ['Denebola','Chort'], ['Chort','Regulus'],
    ]},
    { name: 'Crux', lines: [
      ['Acrux','Mimosa'], ['Acrux','Gacrux'],
    ]},
    { name: 'Canis Major', lines: [
      ['Sirius','Mirzam'], ['Sirius','Adhara'],
      ['Adhara','Wezen'], ['Sirius','Wezen'],
    ]},
    { name: 'Gemini', lines: [
      ['Castor','Pollux'], ['Pollux','Alhena'],
    ]},
    { name: 'Auriga', lines: [
      ['Capella','Menkalinan'], ['Menkalinan','Elnath'], ['Elnath','Capella'],
    ]},
    { name: 'Scorpius', lines: [
      ['Antares','Shaula'], ['Antares','Sargas'], ['Shaula','Sargas'],
    ]},
    { name: 'Sagittarius', lines: [
      ['Kaus Bor','Kaus Med'], ['Kaus Med','Kaus Aus'],
      ['Nunki','Kaus Bor'], ['Nunki','Kaus Aus'],
    ]},
    { name: 'Pegasus', lines: [
      ['Alpheratz','Algenib'], ['Algenib','Markab'],
      ['Markab','Scheat'], ['Scheat','Alpheratz'],
    ]},
    { name: 'Andromeda', lines: [
      ['Alpheratz','Mirach'], ['Mirach','Almach'],
    ]},
    { name: 'Perseus', lines: [
      ['Mirfak','Algol'],
    ]},
  ];


  /* ---------- math helpers ---------- */
  function altAzFromRaDec(raHours, decDeg, lstDeg, latDeg) {
    const haDeg = ((lstDeg - raHours * 15) % 360 + 360) % 360;
    const ha = haDeg * RAD;
    const dec = decDeg * RAD;
    const lat = latDeg * RAD;
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const cosAlt = Math.cos(alt);
    if (Math.abs(cosAlt) < 1e-9) return { alt: alt * DEG, az: 0 };
    const sinAz = -Math.sin(ha) * Math.cos(dec) / cosAlt;
    const cosAz = (Math.sin(dec) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * cosAlt);
    const az = Math.atan2(sinAz, cosAz);
    return { alt: alt * DEG, az: ((az * DEG) + 360) % 360 };
  }

  // Equidistant azimuthal projection looking up at the sky.
  // Returns [x, y] normalized to the unit disc; (0,0) is zenith,
  // r=1 is horizon. Y is positive south, so screen N is up after flipping.
  function altAzToDisc(alt, az) {
    const r = (90 - alt) / 90;
    const a = az * RAD;
    return [r * Math.sin(a), -r * Math.cos(a)];
  }

  // Star-magnitude → drawn radius in mm. Empirical taper.
  function magToRadius(mag) {
    const m = Math.max(-1.5, Math.min(5.5, mag));
    return Math.max(0.06, 0.62 - (m + 1.5) * 0.085);
  }

  function hashString(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed = (seed + 0x6D2B79F5) | 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function slugify(s) {
    return ((s || 'native')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')) || 'native';
  }

  function formatBirthDate(dateStr) {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ];
    if (!y || !m || !d) return dateStr || '';
    return `${d} ${months[m - 1]} ${y}`;
  }


  /* ---------- ornaments ---------- */
  // Tiny eight-point star at (cx, cy) of radius r.
  function ornamentStar(doc, cx, cy, r, color) {
    doc.setFillColor(color[0], color[1], color[2]);
    // four cardinal points
    doc.triangle(cx, cy - r,         cx + r * 0.2, cy,         cx - r * 0.2, cy,         'F');
    doc.triangle(cx, cy + r,         cx - r * 0.2, cy,         cx + r * 0.2, cy,         'F');
    doc.triangle(cx + r, cy,         cx, cy - r * 0.2,         cx, cy + r * 0.2,         'F');
    doc.triangle(cx - r, cy,         cx, cy + r * 0.2,         cx, cy - r * 0.2,         'F');
    // diagonals (smaller)
    const d = r * 0.55;
    doc.triangle(cx + d, cy - d,     cx + d * 0.25, cy + d * 0.05, cx - d * 0.05, cy - d * 0.25, 'F');
    doc.triangle(cx - d, cy + d,     cx - d * 0.25, cy - d * 0.05, cx + d * 0.05, cy + d * 0.25, 'F');
    doc.triangle(cx + d, cy + d,     cx - d * 0.05, cy + d * 0.25, cx + d * 0.25, cy - d * 0.05, 'F');
    doc.triangle(cx - d, cy - d,     cx + d * 0.05, cy - d * 0.25, cx - d * 0.25, cy + d * 0.05, 'F');
  }

  // Decorative horizontal flourish: line — star — line.
  function flourish(doc, cx, y, w, color) {
    const halfW = w / 2;
    const gap = 4;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.25);
    doc.line(cx - halfW, y, cx - gap, y);
    doc.line(cx + gap, y, cx + halfW, y);
    ornamentStar(doc, cx, y, 1.6, color);
  }


  /* ---------- main: build the star map PDF ---------- */
  function generateStarMap(chart) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF not loaded');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const W = 210, H = 297;

    /* palette — parchment + ink + amber */
    const parchment = [246, 240, 224];
    const sky      = [12, 16, 32];
    const skyEdge  = [22, 26, 44];
    const star     = [255, 248, 226];
    const dim      = [200, 196, 180];
    const ink      = [22, 22, 30];
    const accent   = [180, 130, 50];
    const muted    = [120, 100, 70];

    /* observer state */
    const lat = chart.city.lat;
    const lstDeg = ((chart.gmst + chart.city.lon) % 360 + 360) % 360;

    /* ===== page background + frame ===== */
    doc.setFillColor(parchment[0], parchment[1], parchment[2]);
    doc.rect(0, 0, W, H, 'F');

    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, W - 20, H - 20, 'S');
    doc.setLineWidth(0.18);
    doc.rect(13, 13, W - 26, H - 26, 'S');

    /* ===== header ===== */
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('TAJNSTVO   ·   STAR MAP', W / 2, 22, { align: 'center' });

    flourish(doc, W / 2, 28, 36, accent);

    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text('the night sky as seen from the place of birth', W / 2, 34, { align: 'center' });

    /* ===== sky disc ===== */
    const cx = W / 2, cy = 122, R = 73;

    doc.setFillColor(sky[0], sky[1], sky[2]);
    doc.circle(cx, cy, R, 'F');

    // subtle altitude rings
    doc.setDrawColor(skyEdge[0], skyEdge[1], skyEdge[2]);
    doc.setLineWidth(0.1);
    for (const ringAlt of [60, 30, 0]) {
      const rr = R * (90 - ringAlt) / 90;
      doc.circle(cx, cy, rr, 'S');
    }

    /* procedural background stars (deterministic per chart) */
    const seed = hashString(
      (chart.profile.birthDate || '') +
      (chart.profile.birthTime || '') +
      (chart.city.name || '') +
      lat.toFixed(2) + chart.city.lon.toFixed(2)
    );
    const rand = mulberry32(seed);
    const numBg = 720;
    for (let i = 0; i < numBg; i++) {
      const t = 2 * Math.PI * rand();
      const rho = Math.sqrt(rand());
      const x = cx + R * rho * Math.cos(t);
      const y = cy + R * rho * Math.sin(t);
      const sz = 0.04 + Math.pow(rand(), 3) * 0.32;
      const tone = 0.55 + rand() * 0.4;
      const r = Math.round(star[0] * tone);
      const g = Math.round(star[1] * tone);
      const b = Math.round(star[2] * tone);
      doc.setFillColor(r, g, b);
      doc.circle(x, y, sz, 'F');
    }

    /* compute named-star positions (only those above horizon) */
    const positions = {};
    for (const [name, s] of Object.entries(NAMED_STARS)) {
      const { alt, az } = altAzFromRaDec(s.ra, s.dec, lstDeg, lat);
      if (alt < 0) continue;
      const [u, v] = altAzToDisc(alt, az);
      positions[name] = { x: cx + u * R, y: cy + v * R, mag: s.mag, alt };
    }

    /* constellation lines (only when both endpoints above horizon) */
    if (jsPDF.GState) doc.setGState(new jsPDF.GState({ opacity: 0.45 }));
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.18);
    for (const con of CONSTELLATIONS) {
      for (const [a, b] of con.lines) {
        const A = positions[a], B = positions[b];
        if (!A || !B) continue;
        doc.line(A.x, A.y, B.x, B.y);
      }
    }
    if (jsPDF.GState) doc.setGState(new jsPDF.GState({ opacity: 1 }));

    /* named stars (with subtle glow on the brightest) */
    for (const [name, p] of Object.entries(positions)) {
      const radius = magToRadius(p.mag);

      if (p.mag < 1.6 && jsPDF.GState) {
        doc.setFillColor(star[0], star[1], star[2]);
        doc.setGState(new jsPDF.GState({ opacity: 0.10 }));
        doc.circle(p.x, p.y, radius * 4.5, 'F');
        doc.setGState(new jsPDF.GState({ opacity: 0.25 }));
        doc.circle(p.x, p.y, radius * 2.2, 'F');
        doc.setGState(new jsPDF.GState({ opacity: 1 }));
      }

      doc.setFillColor(star[0], star[1], star[2]);
      doc.circle(p.x, p.y, radius, 'F');
    }

    /* horizon ring + cardinal markers (gold) */
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.7);
    doc.circle(cx, cy, R, 'S');

    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('N', cx,           cy - R - 3.6,  { align: 'center' });
    doc.text('S', cx,           cy + R + 5.5,  { align: 'center' });
    doc.text('E', cx + R + 5,   cy + 1.6);
    doc.text('W', cx - R - 5,   cy + 1.6, { align: 'right' });

    /* ===== caption block ===== */
    let y = cy + R + 24;

    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const cityShort = (chart.city.name || '').split(',')[0].toUpperCase();
    doc.text(`THE STARS OVER ${cityShort}`, W / 2, y, { align: 'center' });
    y += 3;

    flourish(doc, W / 2, y + 3, 26, accent);
    y += 14;

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(40);
    doc.text(chart.profile.name || 'Anonymous', W / 2, y, { align: 'center' });
    y += 14;

    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const dateStr = formatBirthDate(chart.profile.birthDate);
    doc.text(`born on ${dateStr} at ${chart.profile.birthTime}`, W / 2, y, { align: 'center' });
    y += 6;
    doc.text(chart.city.name, W / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const tzLabel = `UTC${chart.city.tz >= 0 ? '+' : ''}${chart.city.tz}`;
    doc.text(
      `${chart.city.lat.toFixed(2)}°  ·  ${chart.city.lon.toFixed(2)}°  ·  ${tzLabel}`,
      W / 2, y, { align: 'center' }
    );

    /* bottom mark */
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      'TAJNSTVO   ·   CELESTIAL ATLAS   ·   TAJNSTVO.VERCEL.APP',
      W / 2, H - 16, { align: 'center' }
    );

    /* save */
    doc.save(`tajnstvo-starmap-${slugify(chart.profile.name)}.pdf`);
  }

  // expose to app.js
  window.tajnstvoStarMap = generateStarMap;
})();
