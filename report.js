/* Original report renderers preserved from the live site. */
(()=>{
'use strict';
const {RAD,DEG,CITIES,ELEMENTS,PLANET_KEYS,PLANET_GLYPH,PLANET_COLOR,SIGNS,ASPECTS_DEFS,norm360,julianDay,schlyterDay,gmstDeg,obliquity,solveKepler,elementsAt,eclToEq,geoSun,geoMoon,geoPlanet,geoPluto,geoChiron,isRetrograde,SIGN_RULER,DIGNITIES,dignityOf,computeAscendant,computeMC,computeChart,profileLocation,profileToUTC,geocodeCity,lonToSign,lifePathNumber,meanLunarNorthNode,reduceNumber,PYTH,nameNumber,birthdayNumber,houseOfPlanet,planetsInHouse,findAspects,STORAGE_KEY,APIKEY_KEY,currentProfile,readProfile,writeProfile,readApiKey,writeApiKey,getNatalChart,summarizeChart,REPORT_KEYS,BODY_NAME,ordinal,nodeAxis,reportAspects,stelliaeOf,mcLineLon,lifePathSteps,buildChartFacts}=window.TajnstvoEngine;
  /* ---------- PDF report builder ---------- */

  function longitudeRegion(lon) {
    if (lon >= -180 && lon < -130) return '— mid-Pacific';
    if (lon >= -130 && lon < -90)  return '— North America (Pacific / Mountain)';
    if (lon >=  -90 && lon < -60)  return '— North America (Central / Eastern)';
    if (lon >=  -60 && lon < -30)  return '— Atlantic / South America';
    if (lon >=  -30 && lon <   0)  return '— West Africa / Iberia';
    if (lon >=    0 && lon <  30)  return '— Europe / West Africa';
    if (lon >=   30 && lon <  60)  return '— East Europe / Middle East';
    if (lon >=   60 && lon < 100)  return '— Central / South Asia';
    if (lon >=  100 && lon < 130)  return '— East Asia';
    if (lon >=  130 && lon < 160)  return '— Australia / NZ';
    return '— mid-Pacific';
  }

  function natalAspectsFor(chart, orbScale = 0.9) {
    const out = [];
    const keys = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune'];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        let diff = Math.abs(chart[keys[i]].lon - chart[keys[j]].lon);
        if (diff > 180) diff = 360 - diff;
        for (const def of ASPECTS_DEFS) {
          const off = Math.abs(diff - def.angle);
          if (off <= def.orb * orbScale) {
            out.push({ a: keys[i], b: keys[j], aspect: def, exact: off });
          }
        }
      }
    }
    out.sort((a, b) => a.exact - b.exact);
    return out;
  }

  function hexToRgb(hex) {
    const m = hex.replace('#', '').match(/.{2}/g);
    return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
  }

  function parseSvgPath(d) {
    const tokens = d.match(/[MLZ]|-?\d+(?:\.\d+)?/g) || [];
    const pts = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === 'M' || t === 'L') {
        pts.push([parseFloat(tokens[i + 1]), parseFloat(tokens[i + 2])]);
        i += 2;
      }
    }
    return pts;
  }

  const CONTINENT_PATHS = [
    "M -168 70 L -160 71 L -140 72 L -100 75 L -80 75 L -55 70 L -52 60 L -65 50 L -65 45 L -75 38 L -80 30 L -90 28 L -95 30 L -110 30 L -115 25 L -125 35 L -125 50 L -135 58 L -150 60 L -165 60 Z",
    "M -50 82 L -22 82 L -22 70 L -45 60 L -50 70 Z",
    "M -82 12 L -70 11 L -55 5 L -45 -5 L -38 -10 L -38 -25 L -55 -38 L -65 -50 L -70 -55 L -75 -52 L -80 -40 L -78 -20 L -82 -5 Z",
    "M -10 36 L 0 38 L 10 38 L 25 36 L 40 40 L 60 50 L 60 70 L 30 72 L 5 70 L -10 60 L -10 50 Z",
    "M -18 35 L 10 35 L 30 33 L 42 12 L 50 5 L 52 -5 L 38 -25 L 25 -35 L 18 -35 L 10 -32 L 5 -10 L -10 5 L -18 18 Z",
    "M 32 30 L 55 28 L 60 18 L 55 12 L 45 14 L 38 22 Z",
    "M 30 70 L 60 72 L 100 75 L 140 70 L 175 70 L 180 60 L 145 50 L 130 35 L 120 22 L 105 12 L 95 8 L 88 22 L 75 30 L 60 30 L 50 35 L 40 50 L 30 60 Z",
    "M 70 32 L 88 30 L 90 22 L 80 8 L 72 22 Z",
    "M 95 5 L 120 8 L 140 -5 L 130 -10 L 110 -8 L 95 -2 Z",
    "M 113 -12 L 140 -12 L 153 -25 L 150 -38 L 130 -38 L 115 -32 L 113 -22 Z",
  ];

  const PLANET_ABBR = {
    sun: 'Su', moon: 'Mo', mercury: 'Me', venus: 'Ve', mars: 'Ma',
    jupiter: 'Ju', saturn: 'Sa', uranus: 'Ur', neptune: 'Ne',
  };

  function drawChartWheel(doc, chart, cx, cy, R) {
    const SIGN_BAND_W = 12;
    const HOUSE_BAND_W = 7;
    const PLANET_R_BASE = R - SIGN_BAND_W - HOUSE_BAND_W - 8;
    const ASPECT_R = PLANET_R_BASE - 8;

    const text   = [22, 24, 32];
    const accent = [200, 140, 50];
    const muted  = [140, 134, 118];
    const muted2 = [200, 195, 180];

    const ascLon = chart.ascendant;
    const ascSignStart = Math.floor(ascLon / 30) * 30;

    const lonToXY = (lon, r) => {
      const a = (180 - (lon - ascLon)) * Math.PI / 180;
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    };

    doc.setLineWidth(0.5);
    doc.setDrawColor(muted[0], muted[1], muted[2]);
    doc.circle(cx, cy, R, 'S');
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, R - SIGN_BAND_W, 'S');
    doc.circle(cx, cy, R - SIGN_BAND_W - HOUSE_BAND_W, 'S');
    doc.setLineWidth(0.2);
    doc.setDrawColor(muted2[0], muted2[1], muted2[2]);
    doc.circle(cx, cy, ASPECT_R, 'S');

    const SIGNS_3 = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
    doc.setLineWidth(0.25);
    doc.setDrawColor(muted[0], muted[1], muted[2]);
    for (let i = 0; i < 12; i++) {
      const lon = i * 30;
      const [x1, y1] = lonToXY(lon, R);
      const [x2, y2] = lonToXY(lon, R - SIGN_BAND_W);
      doc.line(x1, y1, x2, y2);
      const [lx, ly] = lonToXY(lon + 15, R - SIGN_BAND_W / 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(text[0], text[1], text[2]);
      doc.text(SIGNS_3[i], lx, ly + 1.2, { align: 'center' });
    }

    doc.setLineWidth(0.15);
    doc.setDrawColor(muted2[0], muted2[1], muted2[2]);
    for (let i = 0; i < 12; i++) {
      const lon = ascSignStart + i * 30;
      const [x1, y1] = lonToXY(lon, R - SIGN_BAND_W);
      const [x2, y2] = lonToXY(lon, R - SIGN_BAND_W - HOUSE_BAND_W);
      doc.line(x1, y1, x2, y2);
      const [hx, hy] = lonToXY(lon + 15, R - SIGN_BAND_W - HOUSE_BAND_W / 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(String(i + 1), hx, hy + 0.8, { align: 'center' });
    }

    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.6);
    const drawAngle = (lon, label) => {
      const [x1, y1] = lonToXY(lon, R - SIGN_BAND_W);
      const [x2, y2] = lonToXY(lon, R + 4);
      doc.line(x1, y1, x2, y2);
      const [tx, ty] = lonToXY(lon, R + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(label, tx, ty, { align: 'center' });
    };
    drawAngle(ascLon, 'AC');
    drawAngle(chart.mc, 'MC');
    drawAngle((ascLon + 180) % 360, 'DC');
    drawAngle((chart.mc + 180) % 360, 'IC');

    const planetData = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune']
      .map(k => ({ key: k, lon: chart[k].lon, retro: chart[k].retro }))
      .sort((a, b) => a.lon - b.lon);

    const offsets = new Array(planetData.length).fill(0);
    for (let i = 1; i < planetData.length; i++) {
      let diff = planetData[i].lon - planetData[i - 1].lon;
      if (diff > 180) diff = 360 - diff;
      if (diff < 7) offsets[i] = offsets[i - 1] + 1;
    }
    const placements = planetData.map((p, i) => ({ ...p, r: PLANET_R_BASE - offsets[i] * 5 }));

    doc.setLineWidth(0.15);
    doc.setDrawColor(muted2[0], muted2[1], muted2[2]);
    for (const p of placements) {
      const [x1, y1] = lonToXY(p.lon, R - SIGN_BAND_W - HOUSE_BAND_W);
      const [x2, y2] = lonToXY(p.lon, p.r + 3);
      doc.line(x1, y1, x2, y2);
    }

    doc.setLineWidth(0.25);
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        let diff = Math.abs(placements[i].lon - placements[j].lon);
        if (diff > 180) diff = 360 - diff;
        for (const def of ASPECTS_DEFS) {
          const off = Math.abs(diff - def.angle);
          if (off <= def.orb * 0.7) {
            const c = hexToRgb(def.tone);
            doc.setDrawColor(c[0], c[1], c[2]);
            const [ax, ay] = lonToXY(placements[i].lon, ASPECT_R);
            const [bx, by] = lonToXY(placements[j].lon, ASPECT_R);
            doc.line(ax, ay, bx, by);
            break;
          }
        }
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    for (const p of placements) {
      const [px, py] = lonToXY(p.lon, p.r);
      doc.setTextColor(text[0], text[1], text[2]);
      doc.text(PLANET_ABBR[p.key], px, py + 1.1, { align: 'center' });
      if (p.retro) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('R', px + 4, py + 1.1, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
      }
    }

    doc.setDrawColor(muted2[0], muted2[1], muted2[2]);
    doc.setLineWidth(0.2);
    doc.line(cx - 2, cy, cx + 2, cy);
    doc.line(cx, cy - 2, cx, cy + 2);
  }

  function drawWorldMap(doc, chart, mapX, mapY, mapW, mapH) {
    const muted = [140, 134, 118];
    const land  = [228, 224, 212];
    const landE = [205, 200, 184];
    const grid  = [220, 215, 200];

    const lonLatToXY = (lon, lat) => [
      mapX + ((lon + 180) / 360) * mapW,
      mapY + ((90  - lat) / 180) * mapH,
    ];

    doc.setFillColor(248, 246, 238);
    doc.rect(mapX, mapY, mapW, mapH, 'F');

    doc.setDrawColor(grid[0], grid[1], grid[2]);
    doc.setLineWidth(0.1);
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = lonLatToXY(lon, 0);
      doc.line(x, mapY, x, mapY + mapH);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = lonLatToXY(0, lat);
      doc.line(mapX, y, mapX + mapW, y);
    }

    doc.setFillColor(land[0], land[1], land[2]);
    doc.setDrawColor(landE[0], landE[1], landE[2]);
    doc.setLineWidth(0.15);
    for (const path of CONTINENT_PATHS) {
      const pts = parseSvgPath(path);
      if (pts.length < 2) continue;
      const [sx, sy] = lonLatToXY(pts[0][0], pts[0][1]);
      const deltas = [];
      for (let i = 1; i < pts.length; i++) {
        const [x, y] = lonLatToXY(pts[i][0], pts[i][1]);
        const [px, py] = lonLatToXY(pts[i - 1][0], pts[i - 1][1]);
        deltas.push([x - px, y - py]);
      }
      doc.lines(deltas, sx, sy, [1, 1], 'FD', true);
    }

    const plotPlanet = (key) => {
      const p = chart[key];
      let mcLon = p.ra - chart.gmst;
      while (mcLon >  180) mcLon -= 360;
      while (mcLon < -180) mcLon += 360;
      const c = hexToRgb(PLANET_COLOR[key]);
      doc.setDrawColor(c[0], c[1], c[2]);

      doc.setLineWidth(0.5);
      const [xMc] = lonLatToXY(mcLon, 0);
      doc.line(xMc, mapY, xMc, mapY + mapH);

      let icLon = mcLon + 180;
      if (icLon >  180) icLon -= 360;
      if (icLon < -180) icLon += 360;
      const [xIc] = lonLatToXY(icLon, 0);
      doc.setLineWidth(0.3);
      const dashSpan = 1.6;
      for (let yy = mapY; yy < mapY + mapH; yy += dashSpan * 2) {
        doc.line(xIc, yy, xIc, Math.min(yy + dashSpan, mapY + mapH));
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(`${PLANET_ABBR[key]} MC`, xMc + 1.2, mapY + 4);
      doc.text(`${PLANET_ABBR[key]} IC`, xIc + 1.2, mapY + mapH - 1.5);

      const tanDec = Math.tan(p.dec * Math.PI / 180);
      const rise = [], setp = [];
      for (let lat = -82; lat <= 82; lat += 2) {
        const cosH = -Math.tan(lat * Math.PI / 180) * tanDec;
        if (cosH < -1 || cosH > 1) continue;
        const H = Math.acos(cosH) * 180 / Math.PI;
        let lonR = mcLon - H, lonS = mcLon + H;
        lonR = ((lonR + 540) % 360) - 180;
        lonS = ((lonS + 540) % 360) - 180;
        rise.push([lonR, lat]);
        setp.push([lonS, lat]);
      }

      const drawArc = (pts, dashed) => {
        if (pts.length < 2) return;
        const segs = [[]];
        for (let i = 0; i < pts.length; i++) {
          if (i > 0 && Math.abs(pts[i][0] - pts[i - 1][0]) > 180) segs.push([]);
          segs[segs.length - 1].push(pts[i]);
        }
        doc.setLineWidth(dashed ? 0.25 : 0.4);
        for (const seg of segs) {
          if (seg.length < 2) continue;
          for (let i = 1; i < seg.length; i++) {
            if (dashed && (i % 2 === 0)) continue;
            const [x1, y1] = lonLatToXY(seg[i - 1][0], seg[i - 1][1]);
            const [x2, y2] = lonLatToXY(seg[i][0], seg[i][1]);
            doc.line(x1, y1, x2, y2);
          }
        }
      };
      drawArc(rise, false);
      drawArc(setp, true);
    };

    for (const k of ['sun','venus','mars','jupiter','saturn']) plotPlanet(k);

    doc.setDrawColor(muted[0], muted[1], muted[2]);
    doc.setLineWidth(0.4);
    doc.rect(mapX, mapY, mapW, mapH, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    for (let lon = -180; lon <= 180; lon += 60) {
      const [x] = lonLatToXY(lon, 0);
      const sign = lon > 0 ? '+' : (lon < 0 ? '-' : '');
      doc.text(`${sign}${Math.abs(lon)}\u00b0`, x, mapY + mapH + 3.5, { align: 'center' });
    }
  }

  const PDF_NATAL_SYSTEM = "You are the Soul Oracle of Tajnstvo. Use a three-phase framework (Activation, Transmutation, Integration) to write a personalised soul reading from the native's chart data. Voice: warm, perceptive, unsentimental, evolutionary. Specific to this chart; never generic. No greeting, no preamble, no bullet points, no italics, no questions. Total length 550-700 words.\n\nReturn EXACTLY 4 sections separated by blank lines. Each section begins with the label on its own line, in capitals, followed by a blank line and then the paragraph.\n\nACTIVATION\n\nWhat is surfacing in this person's life now and asking to be lived. Anchor in Sun, Moon, Rising, and any tight personal-planet aspect.\n\nTRANSMUTATION\n\nWhat is asking to be released, refined, or grieved. Anchor in Saturn placement, hard aspects, and 12th-house material if present.\n\nINTEGRATION\n\nWhat life looks like when this energy is embodied and steady. Anchor in Jupiter, the North Node direction, and the composite of the Big Three.\n\nBOTTOM LINE\n\nA single resonant sentence that names the core of this chart. One sentence only.";

  async function fetchPdfNatalReading(chart) {
    const apiKey = readApiKey();
    if (!apiKey) return null;
    const summary = summarizeChart(chart);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2200,
          system: PDF_NATAL_SYSTEM,
          messages: [{ role: 'user', content: summary + '\n\nWrite the four-paragraph natal reading now.' }],
        }),
      });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      const txt = (data.content || []).map(b => b.type === 'text' ? b.text : '').join('\n');
      const paras = txt.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      return paras.length ? paras : null;
    } catch (err) {
      console.error('PDF natal reading failed:', err);
      return null;
    }
  }

  const REPORT_MODEL = 'claude-sonnet-4-6';
  const SOUL_REPORT_SYSTEM = `You are the writer of "The Soul Report" for Tajnstvo, a celestial atlas. From a precise natal chart you compose a long, literary, psychologically acute reading.

VOICE: warm but unsentimental; perceptive, specific, a little austere. Second person ("you"). The register of the best modern astrology writing — concrete and grounded, never vague horoscope filler, never flattering for its own sake. Name tensions honestly. Short declarative sentences mixed with longer ones. No greetings, no emoji, no headings inside the prose, no bullet points, no questions to the reader.

ABSOLUTE RULE: Use ONLY the astronomical facts provided. Never invent, change, or contradict a sign, degree, house, dignity, node, or aspect. You interpret freely, but the chart is fixed. Lean into the specific facts you are given — dignities (detriment, fall, exaltation), the chart ruler, what disposits the Moon, bodies sitting on the angles, the tightest aspects, the stelliae. That specificity is what makes the reading feel true rather than generic.

OUTPUT: Return ONE valid JSON object and nothing else — no markdown, no code fences, no preamble. All keys must be present. All values are plain text (no markdown, no newlines inside a value unless a field says "paragraphs", in which case separate paragraphs with a single blank line). Keep quotes inside text minimal so the JSON parses.

SCHEMA (fill every field, written specifically for THIS native):
{
  "bigThree": { "intro": "1-2 sentences framing the Sun/Moon/Rising trio for this chart", "sun": "two paragraphs on the Sun by sign, house, dignity", "moon": "two paragraphs on the Moon", "rising": "one to two paragraphs on the Rising and any planet on the Ascendant" },
  "lifePath": { "intro": "1-2 sentences", "title": "a short title like 'The Path of the Three'", "tags": "THREE SHORT EPITHETS IN CAPS SEPARATED BY ' · '", "body": "two to three paragraphs on this Life Path number", "pullQuote": "one resonant sentence" },
  "soulMission": { "intro": "1-2 sentences on the nodal axis", "north": "two paragraphs on the North Node by sign and house", "south": "two paragraphs on the South Node", "box": "a short highlighted aside, 2-3 sentences, the practical instruction", "closing": "one plain-language sentence: the work, in plain terms" },
  "wounds": { "intro": "1-2 sentences", "chiron": "two paragraphs on Chiron by sign and house — the wound and its medicine", "hardAspectTitle": "name the hardest aspect, e.g. 'Saturn square Pluto'", "hardAspect": "two paragraphs on that aspect", "pullQuote": "one sentence", "closing": "one sentence on what the wound gives back when worked with" },
  "love": { "intro": "1-2 sentences on Venus and Mars", "venus": "two paragraphs on Venus by sign, house, dignity, and any conjunction", "mars": "two paragraphs on Mars by sign, house, dignity", "drawnTo": "2-3 sentences: what this person is drawn to", "struggleWith": "2-3 sentences: what they struggle with" },
  "career": { "intro": "1-2 sentences on the Midheaven", "mc": "two paragraphs on the Midheaven sign and any planet there", "supportTitle": "a short title for a supporting factor, e.g. 'Jupiter and Venus in the 11th house'", "support": "one to two paragraphs", "box": "a short practical aside, 2-3 sentences" },
  "money": { "intro": "1-2 sentences on the 2nd house", "north2nd": "two paragraphs (if the North Node or key planets relate to resources; otherwise read the 2nd house ruler and Jupiter)", "ruler": "one to two paragraphs on how money actually flows for this chart", "pullQuote": "one sentence", "closing": "one practical sentence" },
  "astrocartography": { "intro": "1-2 sentences", "locations": [ { "city": "a real city near the given MC-line longitude", "lines": "which line(s), e.g. 'Venus MC · Jupiter MC'", "body": "2-3 sentences on what this place offers" }, { "city": "...", "lines": "...", "body": "..." }, { "city": "...", "lines": "...", "body": "..." } ] },
  "keyAspects": [ { "aspect": "e.g. 'Sun square Moon'", "label": "a 2-4 word essence, e.g. 'the inner tension'" } ],
  "transits": [ { "title": "e.g. 'Jupiter Trine Natal Sun'", "orb": "e.g. '1.2'", "body": "2 sentences of timing guidance" } ]
}
Provide 3 locations, 3-4 keyAspects (use the tightest from the facts), and 3-4 transits (use TODAY'S TRANSITS from the facts).`;

  // Generate the full Soul Report content as structured JSON via Claude.
  async function fetchSoulReportContent(chart) {
    const apiKey = readApiKey();
    if (!apiKey) throw new Error('NO_KEY');
    const facts = buildChartFacts(chart);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: REPORT_MODEL,
        max_tokens: 8000,
        system: SOUL_REPORT_SYSTEM,
        messages: [{ role: 'user', content: facts + '\n\nWrite the complete Soul Report as a single JSON object now.' }],
      }),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (e) {}
      throw new Error('API ' + res.status + (detail ? ' · ' + detail : ''));
    }
    const data = await res.json();
    let txt = (data.content || []).map(b => b.type === 'text' ? b.text : '').join('');
    // tolerant JSON extraction: strip fences, take the outermost braces
    txt = txt.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const first = txt.indexOf('{'), last = txt.lastIndexOf('}');
    if (first < 0 || last < 0) throw new Error('No JSON in response');
    let parsed;
    try { parsed = JSON.parse(txt.slice(first, last + 1)); }
    catch (e) { throw new Error('Could not parse reading JSON'); }
    return parsed;
  }

  /* ============================================================
     SOUL REPORT — editorial renderer (cream + gold, sample design)
     ============================================================ */

  let ASTRO_FONT_B64 = null;
  async function loadAstroFont(doc) {
    try {
      if (!ASTRO_FONT_B64) {
        const res = await fetch('/DejaVuSans.ttf');
        if (!res.ok) throw new Error('font ' + res.status);
        const bytes = new Uint8Array(await res.arrayBuffer());
        let bin = ''; const CH = 0x8000;
        for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
        ASTRO_FONT_B64 = btoa(bin);
      }
      doc.addFileToVFS('DejaVuSans.ttf', ASTRO_FONT_B64);
      doc.addFont('DejaVuSans.ttf', 'astro', 'normal');
      doc.__astro = true;
    } catch (e) { doc.__astro = false; }
  }

  const ZODIAC_GLYPH = { Ari:'♈', Tau:'♉', Gem:'♊', Can:'♋', Leo:'♌', Vir:'♍', Lib:'♎', Sco:'♏', Sag:'♐', Cap:'♑', Aqu:'♒', Pis:'♓' };
  const BODY_GLYPH_PDF = { sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇', chiron:'⚷' };
  const ASPECT_GLYPH = { CONJ:'☌', SEXTILE:'✱', SQUARE:'□', TRINE:'△', OPP:'☍' };
  const SIGN_EL = { Ari:'Fire', Leo:'Fire', Sag:'Fire', Tau:'Earth', Vir:'Earth', Cap:'Earth', Gem:'Air', Lib:'Air', Aqu:'Air', Can:'Water', Sco:'Water', Pis:'Water' };
  const EL_COLOR = { Fire:[196,92,58], Earth:[122,104,178], Air:[86,160,104], Water:[52,160,154] };

  async function generateSoulReport(chart, content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await installUnicodeText(doc);
    const W = 210, H = 297, M = 24;
    const paper = [247, 245, 239], ink = [40, 37, 31], gold = [150, 116, 40], muted = [138, 131, 110], rule = [214, 206, 188], panel = [239, 235, 224];

    await loadAstroFont(doc);
    const hasAstro = doc.__astro === true;

    const setText = c => doc.setTextColor(c[0], c[1], c[2]);
    const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);
    const setFill = c => doc.setFillColor(c[0], c[1], c[2]);
    const hr = (yy, c, w) => { setDraw(c || rule); doc.setLineWidth(w || 0.2); doc.line(M, yy, W - M, yy); };
    const SIGN_FULL = { Ari:'Aries', Tau:'Taurus', Gem:'Gemini', Can:'Cancer', Leo:'Leo', Vir:'Virgo', Lib:'Libra', Sco:'Scorpio', Sag:'Sagittarius', Cap:'Capricorn', Aqu:'Aquarius', Pis:'Pisces' };

    let y = 26, curSection = '';

    function paperBg() { setFill(paper); doc.rect(0, 0, W, H, 'F'); }
    function tracked(text, x, yy, size, opts) {
      opts = opts || {};
      setText(opts.color || muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
      doc.setCharSpace(opts.track == null ? 0.6 : opts.track);
      doc.text(text, x, yy, { align: opts.align || 'left' });
      doc.setCharSpace(0);
    }
    function chrome() {
      tracked(('THE SOUL REPORT  ·  ' + (chart.profile.name || 'NATIVE')).toUpperCase(), M, 13, 7);
      tracked(curSection.toUpperCase(), W - M, 13, 7, { align: 'right' });
      hr(16.5);
      tracked('TAJNSTVO  ·  THE SOUL REPORT', M, H - 11, 7);
      hr(H - 15);
    }
    function startPage(label) { doc.addPage(); curSection = label; paperBg(); chrome(); y = 27; }
    function ensure(h) { if (y + h > H - 20) { doc.addPage(); paperBg(); chrome(); y = 27; } }

    // small-caps: original-uppercase letters & word-initials at full size, rest ~78%
    function scWidth(text, big) {
      const small = big * 0.78; let w = 0;
      for (let i = 0; i < text.length; i++) {
        const c = text[i], isLetter = /[a-zA-Z]/.test(c);
        const isBig = !isLetter ? true : (/[A-Z]/.test(c)) || i === 0 || text[i - 1] === ' ';
        doc.setFontSize(isBig ? big : small);
        w += doc.getTextWidth(c.toUpperCase());
      }
      return w;
    }
    function smallCaps(text, x, yy, big, opts) {
      opts = opts || {};
      doc.setFont('times', opts.style || 'normal');
      setText(opts.color || ink);
      const small = big * 0.78;
      let cx = x;
      if (opts.align === 'center') cx = x - scWidth(text, big) / 2;
      for (let i = 0; i < text.length; i++) {
        const c = text[i], isLetter = /[a-zA-Z]/.test(c);
        const isBig = !isLetter ? true : (/[A-Z]/.test(c)) || i === 0 || text[i - 1] === ' ';
        doc.setFontSize(isBig ? big : small);
        const ch = c.toUpperCase();
        doc.text(ch, cx, yy);
        cx += doc.getTextWidth(ch);
      }
      return cx - x;
    }
    function glyph(g, x, yy, size, color, align) {
      if (!hasAstro || !g) return false;
      setText(color || ink); doc.setFont('astro', 'normal'); doc.setFontSize(size);
      doc.text(g, x, yy, { align: align || 'left' });
      doc.setFont('times', 'normal');
      return true;
    }

    // paragraph flow; text may use blank lines to separate paragraphs
    function para(text, opts) {
      opts = opts || {};
      const size = opts.size || 10.5, lh = opts.lh || 5.1, x = opts.x || M, width = opts.width || (W - 2 * M);
      const blocks = String(text || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      setText(opts.color || ink); doc.setFont('times', opts.style || 'normal'); doc.setFontSize(size);
      for (let bi = 0; bi < blocks.length; bi++) {
        for (const ln of doc.splitTextToSize(blocks[bi], width)) { ensure(lh); doc.text(ln, x, y); y += lh; }
        if (bi < blocks.length - 1) y += lh * 0.55;
        doc.setFont('times', opts.style || 'normal'); doc.setFontSize(size); setText(opts.color || ink);
      }
      y += opts.gapAfter == null ? 4.5 : opts.gapAfter;
    }
    function goldCaps(text) {
      ensure(7); tracked(text.toUpperCase(), M, y, 7.5, { color: gold, track: 0.8 }); y += 7;
    }
    function subTitle(text) {
      ensure(13); smallCaps(text, M, y + 5, 17); y += 11;
    }
    function sectionHeader(num, title, gKey, gIsZodiac) {
      ensure(18);
      hr(y); y += 7;
      tracked('§ ' + num, M, y, 8, { color: gold, track: 1 });
      smallCaps(title, M + 16, y + 0.5, 13, { color: ink });
      const gch = gKey;
      if (gch) glyph(gch, W - M, y + 1, 13, gold, 'right');
      y += 4;
      hr(y); y += 9;
    }
    function intro(text) {
      para(text, { style: 'italic', color: [90, 84, 68], size: 11.5, lh: 5.6, gapAfter: 7 });
    }
    function pullQuote(text) {
      ensure(26); y += 3; hr(y, [210, 200, 180]); y += 8;
      setText(gold); doc.setFont('times', 'italic'); doc.setFontSize(13.5);
      const lines = doc.splitTextToSize('“' + text + '”', W - 2 * M - 24);
      for (const ln of lines) { ensure(7); doc.text(ln, W / 2, y, { align: 'center' }); y += 6.4; }
      y += 3; hr(y, [210, 200, 180]); y += 9;
    }
    function calloutBox(text) {
      doc.setFont('times', 'italic'); doc.setFontSize(10.2);
      const inner = W - 2 * M - 14;
      const lines = doc.splitTextToSize(text, inner);
      const boxH = lines.length * 5 + 10;
      ensure(boxH + 4);
      setFill(panel); doc.rect(M, y, W - 2 * M, boxH, 'F');
      setFill(gold); doc.rect(M, y, 1.4, boxH, 'F');
      setText([90, 84, 68]);
      let ty = y + 7;
      for (const ln of lines) { doc.text(ln, M + 9, ty); ty += 5; }
      y += boxH + 7;
    }

    /* ---------- PAGE 1 — COVER ---------- */
    paperBg();
    tracked('TAJNSTVO  ·  CELESTIAL ATLAS', W / 2, 42, 8.5, { color: gold, track: 1.4, align: 'center' });
    setText([120, 112, 92]); doc.setFont('times', 'italic'); doc.setFontSize(14);
    doc.text('The', W / 2, 96, { align: 'center' });
    smallCaps('Soul Report', W / 2, 116, 40, { align: 'center', color: ink });
    setText([110, 104, 88]); doc.setFont('times', 'italic'); doc.setFontSize(12.5);
    doc.text('A reading of the sky at the hour and place of your birth.', W / 2, 138, { align: 'center' });

    // prepared-for card
    const cardX = M + 18, cardW = W - 2 * (M + 18), cardY = 168, cardH = 74;
    setFill([243, 240, 231]); doc.rect(cardX, cardY, cardW, cardH, 'F');
    hr2(cardX, cardY, cardX + cardW, gold, 0.5); hr2(cardX, cardY + cardH, cardX + cardW, gold, 0.5);
    function hr2(x1, yy, x2, c, w) { setDraw(c); doc.setLineWidth(w); doc.line(x1, yy, x2, yy); }
    tracked('PREPARED FOR', W / 2, cardY + 14, 7.5, { color: gold, track: 1.2, align: 'center' });
    smallCaps(chart.profile.name || 'Anonymous', W / 2, cardY + 30, 20, { align: 'center', color: ink });
    setText([90, 84, 68]); doc.setFont('times', 'italic'); doc.setFontSize(11.5);
    doc.text(prettyDate(chart.profile.birthDate), W / 2, cardY + 41, { align: 'center' });
    doc.text((chart.profile.birthTime || '') + ' local time', W / 2, cardY + 49, { align: 'center' });
    doc.text(chart.city.name, W / 2, cardY + 57, { align: 'center' });
    tracked('GENERATED ' + new Date().toISOString().slice(0, 10).replace(/-/g, ' '), W / 2, cardY + 67, 7, { color: muted, track: 1, align: 'center' });

    // three sign badges: Sun / Moon / Rising
    const sunSign = lonToSign(chart.sun.lon).sign, moonSign = lonToSign(chart.moon.lon).sign, ascSign = lonToSign(chart.ascendant).sign;
    const badgeY = 262, bspc = 22, r = 7;
    const signs = [sunSign, moonSign, ascSign];
    signs.forEach((sg, i) => {
      const cx = W / 2 + (i - 1) * bspc;
      const col = EL_COLOR[SIGN_EL[sg]] || EL_COLOR.Air;
      setFill(col); doc.circle(cx, badgeY, r, 'F');
      if (hasAstro) { doc.setFont('astro', 'normal'); doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.text(ZODIAC_GLYPH[sg], cx, badgeY + 3.4, { align: 'center' }); doc.setFont('times', 'normal'); }
      else { doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(sg.toUpperCase(), cx, badgeY + 2.4, { align: 'center' }); }
    });
    tracked('QUOD SUPRA EST, SICUT QUOD INFRA', W / 2, H - 18, 7.5, { color: gold, track: 1.4, align: 'center' });

    /* ---------- §01 THE BIG THREE ---------- */
    const C = content || {};
    startPage('§ 01 · Big Three');
    sectionHeader('01', 'The Big Three', hasAstro ? '☉☽↑' : '');
    intro((C.bigThree && C.bigThree.intro) || '');

    // three cards
    const cardsY = y, cw = (W - 2 * M - 12) / 3, chh = 30;
    const three = [
      { key: 'sun', label: 'SUN', sign: sunSign, sub: lonToSign(chart.sun.lon).deg.toFixed(0) + '° · ' + ordinal(houseOfPlanet(chart.sun.lon, chart.ascendant)) + ' house' },
      { key: 'moon', label: 'MOON', sign: moonSign, sub: lonToSign(chart.moon.lon).deg.toFixed(0) + '° · ' + ordinal(houseOfPlanet(chart.moon.lon, chart.ascendant)) + ' house' },
      { key: 'rising', label: 'RISING', sign: ascSign, sub: lonToSign(chart.ascendant).deg.toFixed(0) + '° ascendant' },
    ];
    three.forEach((t, i) => {
      const x = M + i * (cw + 6);
      setDraw(rule); doc.setLineWidth(0.5); doc.line(x, cardsY, x + cw, cardsY);
      const g = t.key === 'rising' ? '↑' : BODY_GLYPH_PDF[t.key];
      if (!glyph(g, x + cw / 2, cardsY + 9, 11, gold, 'center')) { tracked(t.label, x + cw / 2, cardsY + 8, 7, { color: gold, align: 'center' }); }
      tracked(t.label, x + cw / 2, cardsY + 15, 6.5, { color: muted, track: 0.8, align: 'center' });
      smallCaps(SIGN_FULL[t.sign] || t.sign, x + cw / 2, cardsY + 23, 13, { align: 'center', color: ink });
      setText(muted); doc.setFont('times', 'italic'); doc.setFontSize(8.5);
      doc.text(t.sub, x + cw / 2, cardsY + 29, { align: 'center' });
    });
    y = cardsY + chh + 8;

    subTitle('Sun in ' + (SIGN_FULL[sunSign] || sunSign));
    goldCaps(lonToSign(chart.sun.lon).deg.toFixed(0) + '° ' + (SIGN_FULL[sunSign] || sunSign) + ' · ' + ordinal(houseOfPlanet(chart.sun.lon, chart.ascendant)) + ' house · ruled by ' + SIGN_RULER[sunSign]);
    para((C.bigThree && C.bigThree.sun) || '');
    subTitle('Moon in ' + (SIGN_FULL[moonSign] || moonSign));
    goldCaps(lonToSign(chart.moon.lon).deg.toFixed(0) + '° ' + (SIGN_FULL[moonSign] || moonSign) + ' · ' + ordinal(houseOfPlanet(chart.moon.lon, chart.ascendant)) + ' house · ruled by ' + SIGN_RULER[moonSign]);
    para((C.bigThree && C.bigThree.moon) || '');
    subTitle((SIGN_FULL[ascSign] || ascSign) + ' Rising');
    goldCaps(lonToSign(chart.ascendant).deg.toFixed(0) + '° ' + (SIGN_FULL[ascSign] || ascSign) + ' ascendant');
    para((C.bigThree && C.bigThree.rising) || '');

    /* ---------- §02 LIFE PATH ---------- */
    startPage('§ 02 · Life Path');
    sectionHeader('02', 'Life Path Number', hasAstro ? '▲' : '');
    intro((C.lifePath && C.lifePath.intro) || '');
    {
      const lp = lifePathSteps(chart.profile.birthDate);
      if (lp) {
        ensure(48);
        setText(muted); doc.setFont('times', 'italic'); doc.setFontSize(11);
        doc.text(lp.dmy + '  →  ' + lp.digits + '  →  ' + lp.chain.join('  →  '), W / 2, y + 4, { align: 'center' });
        y += 8;
        setText(gold); doc.setFont('times', 'normal'); doc.setFontSize(58);
        doc.text(String(lp.number), W / 2, y + 30, { align: 'center' });
        y += 38;
        if (C.lifePath && C.lifePath.tags) tracked(C.lifePath.tags, W / 2, y, 8, { color: gold, track: 1, align: 'center' });
        y += 6; hr(y); y += 10;
      }
      if (C.lifePath && C.lifePath.title) { subTitle(C.lifePath.title); }
      para((C.lifePath && C.lifePath.body) || '');
      if (C.lifePath && C.lifePath.pullQuote) pullQuote(C.lifePath.pullQuote);
    }

    /* ---------- §03 SOUL MISSION ---------- */
    startPage('§ 03 · Soul Mission');
    sectionHeader('03', 'Soul Mission', hasAstro ? '☊' : '');
    intro((C.soulMission && C.soulMission.intro) || '');
    {
      const nodes = nodeAxis(chart);
      subTitle('North Node in ' + (SIGN_FULL[nodes.north.sign.sign] || nodes.north.sign.sign));
      goldCaps(nodes.north.sign.deg.toFixed(0) + '° ' + (SIGN_FULL[nodes.north.sign.sign] || nodes.north.sign.sign) + ' · ' + ordinal(nodes.north.house) + ' house');
      para((C.soulMission && C.soulMission.north) || '');
      subTitle('South Node in ' + (SIGN_FULL[nodes.south.sign.sign] || nodes.south.sign.sign));
      goldCaps(nodes.south.sign.deg.toFixed(0) + '° ' + (SIGN_FULL[nodes.south.sign.sign] || nodes.south.sign.sign) + ' · ' + ordinal(nodes.south.house) + ' house');
      para((C.soulMission && C.soulMission.south) || '');
      if (C.soulMission && C.soulMission.box) calloutBox(C.soulMission.box);
      if (C.soulMission && C.soulMission.closing) para(C.soulMission.closing, { style: 'italic', color: [90, 84, 68] });
    }

    /* ---------- §04 GREATEST WOUNDS ---------- */
    startPage('§ 04 · Greatest Wounds');
    sectionHeader('04', 'Greatest Wounds', hasAstro ? '⚷' : '');
    intro((C.wounds && C.wounds.intro) || '');
    {
      const chSign = lonToSign(chart.chiron.lon).sign;
      subTitle('Chiron in ' + (SIGN_FULL[chSign] || chSign));
      goldCaps(lonToSign(chart.chiron.lon).deg.toFixed(0) + '° ' + (SIGN_FULL[chSign] || chSign) + ' · ' + ordinal(houseOfPlanet(chart.chiron.lon, chart.ascendant)) + ' house');
      para((C.wounds && C.wounds.chiron) || '');
      if (C.wounds && C.wounds.hardAspectTitle) { subTitle(C.wounds.hardAspectTitle); }
      para((C.wounds && C.wounds.hardAspect) || '');
      if (C.wounds && C.wounds.pullQuote) pullQuote(C.wounds.pullQuote);
      if (C.wounds && C.wounds.closing) para(C.wounds.closing);
    }

    /* ---------- §05 LOVE & RELATIONSHIPS ---------- */
    startPage('§ 05 · Love');
    sectionHeader('05', 'Love & Relationships', hasAstro ? '♀' : '');
    intro((C.love && C.love.intro) || '');
    {
      const vSign = lonToSign(chart.venus.lon).sign, mSign = lonToSign(chart.mars.lon).sign;
      const vDig = dignityOf('venus', vSign), mDig = dignityOf('mars', mSign);
      subTitle('Venus in ' + (SIGN_FULL[vSign] || vSign));
      goldCaps(lonToSign(chart.venus.lon).deg.toFixed(0) + '° ' + (SIGN_FULL[vSign] || vSign) + ' · ' + ordinal(houseOfPlanet(chart.venus.lon, chart.ascendant)) + ' house' + (vDig ? ' · ' + vDig : ''));
      para((C.love && C.love.venus) || '');
      subTitle('Mars in ' + (SIGN_FULL[mSign] || mSign));
      goldCaps(lonToSign(chart.mars.lon).deg.toFixed(0) + '° ' + (SIGN_FULL[mSign] || mSign) + ' · ' + ordinal(houseOfPlanet(chart.mars.lon, chart.ascendant)) + ' house' + (mDig ? ' · ' + mDig : ''));
      para((C.love && C.love.mars) || '');
      // two-column drawn to / struggle with
      if (C.love && (C.love.drawnTo || C.love.struggleWith)) {
        ensure(40);
        const colW = (W - 2 * M - 10) / 2, lx = M, rx = M + colW + 10;
        tracked('YOU ARE DRAWN TO', lx, y, 7.5, { color: gold, track: 0.8 });
        tracked('YOU STRUGGLE WITH', rx, y, 7.5, { color: gold, track: 0.8 });
        const yTop = y + 6;
        setText(ink); doc.setFont('times', 'normal'); doc.setFontSize(10);
        const lLines = doc.splitTextToSize(C.love.drawnTo || '', colW);
        const rLines = doc.splitTextToSize(C.love.struggleWith || '', colW);
        let ly = yTop, ry = yTop;
        for (const ln of lLines) { doc.text(ln, lx, ly); ly += 4.8; }
        for (const ln of rLines) { doc.text(ln, rx, ry); ry += 4.8; }
        y = Math.max(ly, ry) + 4;
      }
    }

    /* ---------- §06 CAREER & CALLING ---------- */
    startPage('§ 06 · Career');
    sectionHeader('06', 'Career & Calling', hasAstro ? '♃' : '');
    intro((C.career && C.career.intro) || '');
    {
      const mcSign = lonToSign(chart.mc).sign;
      subTitle('Midheaven in ' + (SIGN_FULL[mcSign] || mcSign));
      goldCaps(lonToSign(chart.mc).deg.toFixed(0) + '° ' + (SIGN_FULL[mcSign] || mcSign) + ' · the public self');
      para((C.career && C.career.mc) || '');
      if (C.career && C.career.supportTitle) subTitle(C.career.supportTitle);
      para((C.career && C.career.support) || '');
      if (C.career && C.career.box) calloutBox(C.career.box);
    }

    /* ---------- §07 MONEY & RESOURCES ---------- */
    startPage('§ 07 · Money');
    sectionHeader('07', 'Money & Resources', hasAstro ? '♃' : '');
    intro((C.money && C.money.intro) || '');
    {
      subTitle('The 2nd House');
      goldCaps('what you own, value, and can build');
      para((C.money && C.money.north2nd) || '');
      if (C.money && C.money.ruler) { subTitle('How money moves'); para(C.money.ruler); }
      if (C.money && C.money.pullQuote) pullQuote(C.money.pullQuote);
      if (C.money && C.money.closing) para(C.money.closing, { style: 'italic', color: [90, 84, 68] });
    }

    /* ---------- §08 CHART WHEEL ---------- */
    startPage('§ 08 · Chart Wheel');
    sectionHeader('08', 'The Chart Wheel', hasAstro ? '⊕' : '');
    intro('Your sky, drawn. The Ascendant is at the left; the Midheaven near the top. Planets sit where they were, and the lines between them are the major aspects.');
    drawChartWheel(doc, chart, W / 2, y + 58, 52);
    y += 124;
    {
      const colW = (W - 2 * M - 12) / 2, lx = M, rx = M + colW + 12;
      tracked('KEY ASPECTS', lx, y, 7.5, { color: gold, track: 0.8 });
      tracked('STELLIA', rx, y, 7.5, { color: gold, track: 0.8 });
      let ly = y + 7, ry = y + 7;
      setText(ink); doc.setFont('times', 'normal'); doc.setFontSize(9.5);
      const ka = (C.keyAspects && C.keyAspects.length) ? C.keyAspects : reportAspects(chart).slice(0, 4).map(a => ({ aspect: BODY_NAME[a.a] + ' ' + a.aspect.name.toLowerCase() + ' ' + BODY_NAME[a.b], label: '' }));
      for (const a of ka.slice(0, 5)) { doc.setFont('times', 'normal'); doc.setFontSize(9.5); setText(ink); doc.text(a.aspect + (a.label ? '  ·  ' + a.label : ''), lx, ly); ly += 5.2; }
      for (const s of stelliaeOf(chart).slice(0, 4)) { doc.setFont('times', 'normal'); doc.setFontSize(9.5); setText(ink); doc.text(ordinal(s.house) + ' house · ' + s.bodies.map(k => BODY_NAME[k]).join(' + '), rx, ry); ry += 5.2; }
      y = Math.max(ly, ry) + 4;
    }

    /* ---------- §09 ASTROCARTOGRAPHY + §10 TRANSITS ---------- */
    startPage('§ 09 · Map & Sky');
    sectionHeader('09', 'Astrocartography', hasAstro ? '⊕' : '');
    intro((C.astrocartography && C.astrocartography.intro) || 'Your planetary lines fall across the Earth in particular places.');
    {
      const locs = (C.astrocartography && C.astrocartography.locations) || [];
      for (const loc of locs.slice(0, 3)) {
        ensure(20);
        smallCaps(loc.city || '', M, y + 4, 14);
        const tw = scWidth(loc.city || '', 14);
        y += 6;
        tracked((loc.lines || '').toUpperCase(), M, y, 7, { color: gold, track: 0.6 });
        y += 6;
        para(loc.body || '', { size: 10, lh: 4.8, gapAfter: 6 });
      }
    }
    y += 2;
    sectionHeader('10', "Today's Transits", hasAstro ? '☄' : '');
    para('The sky, on the day your report was generated, moving against your natal chart.', { style: 'italic', color: [90, 84, 68], size: 10.5, gapAfter: 6 });
    {
      const trs = (C.transits && C.transits.length) ? C.transits : [];
      for (const t of trs.slice(0, 5)) {
        ensure(16);
        smallCaps(t.title || '', M, y + 3, 11);
        if (t.orb) tracked(t.orb + '° ORB', W - M, y + 2, 7, { color: muted, track: 0.6, align: 'right' });
        y += 6;
        para(t.body || '', { size: 9.8, lh: 4.6, gapAfter: 5 });
      }
    }

    // stamp page numbers
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      tracked(i + ' / ' + total, W - M, H - 11, 7, { color: muted, track: 0.4, align: 'right' });
    }

    const slug = ((chart.profile.name || 'soul').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) || 'report';
    doc.save('tajnstvo-soul-report-' + slug + '.pdf');
    return doc;
  }

  async function installUnicodeText(doc) {
    await loadAstroFont(doc);
    const original = doc.text.bind(doc);
    doc.text = function(text, ...args) {
      if (/[^\u0000-\u024f]/.test(Array.isArray(text) ? text.join(' ') : String(text)) && doc.getFontList().astro) {
        const font = doc.getFont();
        doc.setFont('astro', 'normal');
        const result = original(text, ...args);
        doc.setFont(font.fontName, font.fontStyle);
        return result;
      }
      return original(text, ...args);
    };
  }

  function prettyDate(iso) {
    if (!iso) return '';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [y, m, d] = iso.split('-').map(Number);
    return (d || '') + ' ' + (months[(m || 1) - 1] || '') + ' ' + (y || '');
  }

  async function generatePdfReport(chart, aiReading) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await installUnicodeText(doc);
    const W = 210, H = 297, M = 22;
    const text  = [22, 24, 32];
    const accent = [200, 140, 50];
    const muted = [125, 120, 105];
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const setText = c => doc.setTextColor(c[0], c[1], c[2]);
    const setDraw = c => doc.setDrawColor(c[0], c[1], c[2]);
    const rule = (y, c = muted) => { setDraw(c); doc.setLineWidth(0.2); doc.line(M, y, W - M, y); };

    // Page numbers are stamped at the very end (dynamic page count), so the
    // num/total args here are ignored — kept only so existing call sites compile.
    let curLabel = '';
    function pageFrame(num, total, label) {
      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('TAJNSTVO   ·   CELESTIAL ATLAS', M, 12);
      doc.text(label, W / 2, 12, { align: 'center' });
      rule(16);
      // footer
      doc.text('tajnstvoto.com', M, H - 10);
      doc.text(new Date().toISOString().slice(0, 10), W - M, H - 10, { align: 'right' });
      rule(H - 14);
      curLabel = label;
    }
    const totalPages = 0; // unused — real total stamped at the end

    // ---- dynamic-flow layout helpers ----
    let y = 36;
    const BOTTOM = H - 22;
    const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
    function startPage(label) { doc.addPage(); pageFrame(0, 0, label); y = 34; }
    function ensure(space) { if (y + space > BOTTOM) { doc.addPage(); pageFrame(0, 0, curLabel + '  (CONT.)'); y = 34; } }
    function gap(n) { y += n; }
    function bigTitle(t) { setText(text); doc.setFont('times', 'normal'); doc.setFontSize(22); doc.text(t, M, y); rule(y + 4); y += 13; }
    function subHead(t) { ensure(11); setText(text); doc.setFont('times', 'italic'); doc.setFontSize(13); doc.text(t, M, y); y += 6; }
    function capNote(t) { ensure(8); setText(muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(t, M, y); y += 7.5; }
    function bodyPara(t, opts) {
      opts = opts || {};
      const size = opts.size || 10.5, lh = opts.lh || 5, x = opts.x || M;
      const width = opts.width || (W - 2 * M);
      const gapAfter = opts.gapAfter == null ? 5 : opts.gapAfter;
      setText(opts.color || text);
      doc.setFont((opts.font && opts.font[0]) || 'times', (opts.font && opts.font[1]) || 'normal');
      doc.setFontSize(size);
      for (const ln of doc.splitTextToSize(t, width)) { ensure(lh); doc.text(ln, x, y); y += lh; }
      y += gapAfter;
    }
    const D = window.tajnstvoSoulData || {};
    const PA = D.PLANET_ARCHETYPES || {};
    const allAsp = natalAspectsFor(chart, 0.9);

    // Deep-dive page for a single planet: archetype, sign, house, aspects.
    function planetPage(key) {
      const A = PA[key];
      const p = chart[key];
      if (!A || !p) return;
      const sgn = lonToSign(p.lon);
      const full = (D.SIGN_FULL || {})[sgn.sign] || sgn.sign;
      const el = (D.SIGN_ELEMENT || {})[sgn.sign] || '';
      const mod = (D.SIGN_MODALITY || {})[sgn.sign] || '';
      const house = houseOfPlanet(p.lon, chart.ascendant);
      const pname = A.name.replace(/^The /, '');
      startPage(pname.toUpperCase());

      setText(text);
      doc.setFont('times', 'italic');
      doc.setFontSize(24);
      doc.text(A.name + ' in ' + full, M, y);
      y += 9;
      capNote(A.governs + '   ·   ' + sgn.sign + ' ' + sgn.deg.toFixed(1) + '°   ·   ' + ord(house) + ' house' + (p.retro ? '   ·   RETROGRADE' : ''));
      gap(3);

      bodyPara(A.body);
      if (el && mod) {
        bodyPara('Placed in ' + full + ' — a ' + mod.toLowerCase() + ' ' + el.toLowerCase() + ' sign — its ' + (D.ELEMENT_TONE || {})[el] + ', and ' + (D.MODALITY_TONE || {})[mod] + '.');
      }
      bodyPara('In the ' + ord(house) + ' house, this lives out through ' + ((D.HOUSE_THEMES || {})[house] || 'the affairs of that house') + '.');
      if (p.retro) {
        bodyPara('Retrograde at birth: this energy turns inward before it turns outward. You meet ' + pname + '’s lessons internally first, and often come into your own with it later than your peers.', { font: ['times', 'italic'], color: muted, size: 10 });
      }
      bodyPara('Shadow — ' + A.shadow, { font: ['times', 'italic'], color: muted, size: 10 });

      const mine = allAsp.filter(a => a.a === key || a.b === key).slice(0, 6);
      if (mine.length) {
        gap(3);
        capNote('ASPECTS TO ' + pname.toUpperCase());
        for (const a of mine) {
          const other = a.a === key ? a.b : a.a;
          const m = (D.ASPECT_MEANINGS || {})[a.aspect.name] || { label: a.aspect.name.toLowerCase(), line: '' };
          ensure(11);
          setText(text);
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          doc.text(pname + ' ' + m.label + ' ' + cap(other), M, y);
          setText(muted);
          doc.setFont('courier', 'normal');
          doc.setFontSize(8);
          doc.text('orb ' + a.exact.toFixed(1) + '°', W - M, y, { align: 'right' });
          y += 5;
          bodyPara(m.line, { font: ['times', 'italic'], color: muted, size: 9.5, lh: 4.4, gapAfter: 3 });
        }
      }
    }

    // ============== PAGE 1 — COVER + PLACEMENTS ==============
    pageFrame(1, totalPages, 'NATAL REPORT');

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(54);
    setText(accent);
    doc.setFont('times', 'italic');
    doc.setFontSize(60);
    doc.text('Tajnstvo', W / 2, 88, { align: 'center' });

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NATAL  ·  TROPICAL  ·  WHOLE-SIGN', W / 2, 108, { align: 'center' });

    // native block
    y = 132;
    setText(muted);
    doc.setFontSize(7.5);
    doc.text('NATIVE', M, y);
    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text(chart.profile.name || 'Anonymous', M, y + 10);

    y += 26;
    setText(muted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('BIRTH', M, y);
    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.text(`${chart.profile.birthDate}   ·   ${chart.profile.birthTime}`, M, y + 8);
    doc.text(chart.city.name, M, y + 18);
    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const tzLabel = `UTC${chart.city.tz >= 0 ? '+' : ''}${chart.city.tz}`;
    doc.text(`${chart.city.lat.toFixed(2)}°,  ${chart.city.lon.toFixed(2)}°   ·   ${tzLabel}`, M, y + 25);

    // placements table — right column
    const colX = W / 2 + 4;
    let py = 132;
    setText(muted);
    doc.setFontSize(7.5);
    doc.text('PLACEMENTS', colX, py);
    py += 8;

    const placements = [
      ['Sun',       chart.sun],
      ['Moon',      chart.moon],
      ['Mercury',   chart.mercury],
      ['Venus',     chart.venus],
      ['Mars',      chart.mars],
      ['Jupiter',   chart.jupiter],
      ['Saturn',    chart.saturn],
      ['Uranus',    chart.uranus],
      ['Neptune',   chart.neptune],
      [null, null],
      ['Ascendant', { lon: chart.ascendant }],
      ['Midheaven', { lon: chart.mc }],
    ];
    doc.setFontSize(10);
    for (const [name, body] of placements) {
      if (name === null) { py += 3; continue; }
      const sgn = lonToSign(body.lon);
      setText(text);
      doc.setFont('times', 'normal');
      doc.text(name, colX, py);
      setText(accent);
      doc.setFont('courier', 'normal');
      const deg = sgn.deg.toFixed(1).padStart(4);
      doc.text(`${sgn.sign}  ${deg}°${body.retro ? '  R' : ''}`, colX + 30, py);
      py += 6;
    }

    // ============== CONTENTS ==============
    startPage('CONTENTS');
    bigTitle('Contents');
    bodyPara('This report is cast entirely from the sky as it stood at the place and minute of your birth — the planets at their real ecliptic longitudes, the houses measured from your rising sign. Read it slowly. Each section is one lens; together they describe a single person.', { font: ['times', 'italic'], color: muted, size: 11 });
    gap(4);
    {
      const toc = [
        ['I', 'The Chart Wheel', 'Your whole sky, drawn'],
        ['II', 'The Big Three', 'Sun, Moon, and Rising, read together'],
        ['III', 'Soul Mission', 'Life Path number and North Node'],
        ['IV', 'The Planets', 'Sun through Saturn, each in depth'],
        ['V', 'The Outer Planets', 'Uranus and Neptune'],
        ['VI', 'Numerology', 'The numbers in your name and birth date'],
        ['VII', 'Relationships', 'Venus, Mars, and the 7th house'],
        ['VIII', 'Vocation', 'Midheaven and the 10th house'],
        ['IX', 'Resources', 'The 2nd house, Jupiter, and value'],
        ['X', 'Greatest Wounds', 'Saturn, the 12th house, the South Node'],
        ['XI', 'Astrocartography', 'Your planetary lines across the Earth'],
        ['XII', 'Aspects & Transits', 'The conversations inside your chart, and today’s sky'],
      ];
      for (const [num, title, sub] of toc) {
        ensure(11);
        setText(accent);
        doc.setFont('times', 'italic');
        doc.setFontSize(12);
        doc.text(num, M, y);
        setText(text);
        doc.setFont('times', 'normal');
        doc.setFontSize(13);
        doc.text(title, M + 14, y);
        setText(muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(sub, M + 14, y + 4.6);
        y += 12;
      }
    }

    // ============== PAGE 2 — CHART WHEEL ==============
    doc.addPage();
    pageFrame(2, totalPages, 'CHART WHEEL');

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Chart Wheel', M, 34);
    rule(38);

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('PLANETS PLOTTED AT THEIR ECLIPTIC LONGITUDES.  WHOLE-SIGN HOUSES FROM THE ASCENDANT.', M, 46);

    drawChartWheel(doc, chart, W / 2, 138, 76);

    let legY = 230;
    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('LEGEND', M, legY);
    rule(legY + 3, [220, 215, 200]);
    legY += 9;
    setText(text);
    doc.setFontSize(9);
    const legendItems = [
      'Su Sun', 'Mo Moon', 'Me Mercury', 'Ve Venus',
      'Ma Mars', 'Ju Jupiter', 'Sa Saturn', 'Ur Uranus',
      'Ne Neptune', 'AC Asc', 'MC Midheaven', 'R retrograde',
    ];
    const legCol = (W - 2 * M) / 4;
    for (let i = 0; i < legendItems.length; i++) {
      const ci = i % 4, ri = Math.floor(i / 4);
      doc.text(legendItems[i], M + ci * legCol, legY + ri * 6);
    }

    let aspKeyY = legY + Math.ceil(legendItems.length / 4) * 6 + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(muted);
    doc.text('ASPECT COLOURS', M, aspKeyY);
    aspKeyY += 5;
    const colorKeys = [
      { name: 'CONJ',    color: '#c8a060' },
      { name: 'SEXTILE', color: '#7cc090' },
      { name: 'SQUARE',  color: '#e07060' },
      { name: 'TRINE',   color: '#80b8c8' },
      { name: 'OPP',     color: '#c870a0' },
    ];
    let kx = M;
    for (const k of colorKeys) {
      const c2 = hexToRgb(k.color);
      doc.setDrawColor(c2[0], c2[1], c2[2]);
      doc.setLineWidth(0.7);
      doc.line(kx, aspKeyY, kx + 8, aspKeyY);
      setText(text);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(k.name, kx + 10, aspKeyY + 1);
      kx += 28;
    }

    // ============== THE BIG THREE ==============
    {
      const ST = D.SIGN_TEXTS || {};
      const SIGN_FULL = D.SIGN_FULL || {};
      startPage('THE BIG THREE');
      bigTitle('The Big Three');
      capNote('SUN · MOON · RISING — THE THREE PILLARS OF THE CHART, READ TOGETHER.');
      gap(3);
      const bigThree = [
        { label: 'Sun', body: chart.sun, key: 'sun' },
        { label: 'Moon', body: chart.moon, key: 'moon' },
        { label: 'Rising', body: { lon: chart.ascendant, retro: false }, key: 'rising' },
      ];
      for (const item of bigThree) {
        const sgn = lonToSign(item.body.lon);
        const houseStr = item.key === 'rising' ? '' : '   ·   ' + ord(houseOfPlanet(item.body.lon, chart.ascendant)) + ' house';
        ensure(20);
        setText(text);
        doc.setFont('times', 'italic');
        doc.setFontSize(15);
        doc.text(item.label + ' in ' + (SIGN_FULL[sgn.sign] || sgn.sign) + '   ·   ' + sgn.deg.toFixed(1) + '°' + houseStr, M, y);
        y += 7;
        bodyPara((ST[sgn.sign] || {})[item.key] || '', { gapAfter: 8 });
      }
      gap(2);
      bodyPara('Your Sun is who you are becoming; your Moon is who you are when no one is watching; your Rising is the door the world comes through. When the three agree, you read as whole. When they pull against each other, that tension is much of the inner story — and much of the work.', { font: ['times', 'italic'], color: muted, size: 10.5 });
    }

    // ============== SOUL MISSION ==============
    {
      const SIGN_FULL = D.SIGN_FULL || {};
      startPage('SOUL MISSION');
      bigTitle('Soul Mission');

      const lp = chart.lifePath;
      const lpEntry = lp != null ? (D.LIFE_PATH || {})[lp] : null;
      capNote('LIFE PATH NUMBER');
      ensure(24);
      const numY = y;
      setText(accent);
      doc.setFont('times', 'italic');
      doc.setFontSize(44);
      doc.text(String(lp == null ? '?' : lp), M, numY + 13);
      setText(text);
      doc.setFont('times', 'normal');
      doc.setFontSize(16);
      if (lpEntry) doc.text(lpEntry.name, M + 28, numY + 5);
      setText(muted);
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      let ly = numY + 11;
      if (lpEntry) for (const ln of doc.splitTextToSize(lpEntry.line, W - 2 * M - 28)) { doc.text(ln, M + 28, ly); ly += 5; }
      y = Math.max(numY + 20, ly) + 9;

      capNote('NORTH NODE  ·  EVOLUTIONARY DIRECTION');
      const nnSign = lonToSign(chart.northNode);
      ensure(14);
      setText(accent);
      doc.setFont('times', 'italic');
      doc.setFontSize(18);
      doc.text(nnSign.sign + ' ' + nnSign.deg.toFixed(1) + '°', M, y);
      y += 7;
      bodyPara((D.NORTH_NODE || {})[nnSign.sign] || '');

      const sSign = SIGNS[(SIGNS.indexOf(nnSign.sign) + 6) % 12];
      bodyPara('Your South Node sits opposite, in ' + (SIGN_FULL[sSign] || sSign) + ' — the gifts and habits you already carry, fluent from the start. They are not wrong, only finished. The growth is the slow lean away from that old comfort, toward the North Node’s less familiar ground.', { font: ['times', 'italic'], color: muted, size: 10.5 });

      gap(3);
      capNote('THE ARC OF THE WORK');
      const PH = D.PHASES || {};
      for (const [k, label] of [['activation', 'Activation'], ['transmutation', 'Transmutation'], ['integration', 'Integration']]) {
        ensure(12);
        setText(text);
        doc.setFont('times', 'italic');
        doc.setFontSize(12);
        doc.text(label, M, y);
        y += 5;
        bodyPara(PH[k] || '', { color: muted, size: 10, gapAfter: 4 });
      }
    }

    // ============== THE PLANETS - one deep-dive page each ==============
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].forEach(planetPage);

    // ============== THE OUTER PLANETS ==============
    {
      const SIGN_FULL = D.SIGN_FULL || {};
      startPage('OUTER PLANETS');
      bigTitle('The Outer Planets');
      capNote('SLOW, GENERATIONAL BODIES — THEY COLOUR A WHOLE COHORT. BUT THEIR HOUSE IS YOURS ALONE.');
      gap(3);
      for (const key of ['uranus', 'neptune']) {
        const A = PA[key], p = chart[key];
        if (!A || !p) continue;
        const sgn = lonToSign(p.lon);
        const house = houseOfPlanet(p.lon, chart.ascendant);
        ensure(42);
        setText(text);
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.text(A.name + ' in ' + (SIGN_FULL[sgn.sign] || sgn.sign) + '   ·   ' + ord(house) + ' house' + (p.retro ? '   ·   R' : ''), M, y);
        y += 7;
        bodyPara(A.body, { gapAfter: 4 });
        bodyPara('For you it concentrates on ' + ((D.HOUSE_THEMES || {})[house] || 'that house') + ' — the corner of life where you are least willing to be ordinary, and most likely to break the inherited pattern.', { font: ['times', 'italic'], color: muted, size: 10, gapAfter: 9 });
      }
    }

    // ============== PAGE 4 — NUMEROLOGY ==============
    doc.addPage();
    pageFrame(4, totalPages, 'NUMEROLOGY');

    {
      const ND = (window.tajnstvoSoulData || {});
      const NUM = ND.NUMBER_MEANINGS || {};
      const POS = ND.NUMBER_POSITIONS || {};

      setText(text);
      doc.setFont('times', 'normal');
      doc.setFontSize(22);
      doc.text('Numerology', M, 34);
      rule(38);

      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('YOUR NAME AND BIRTH DATE REDUCE TO A SET OF CORE NUMBERS. EACH NAMES A DIFFERENT LAYER OF YOU.', M, 46);

      const pname = (chart.profile.name || '').trim();
      const items = [];
      items.push({ label: 'Life Path',   num: chart.lifePath,                         pos: POS.lifePath });
      items.push({ label: 'Birthday',    num: birthdayNumber(chart.profile.birthDate), pos: POS.birthday });
      if (pname) {
        items.push({ label: 'Expression',  num: nameNumber(pname, 'all'),         pos: POS.expression });
        items.push({ label: 'Soul Urge',   num: nameNumber(pname, 'vowels'),      pos: POS.soulUrge });
        items.push({ label: 'Personality', num: nameNumber(pname, 'consonants'),  pos: POS.personality });
      }

      let y = 60;
      for (const it of items) {
        if (it.num == null) continue;
        const meaning = NUM[it.num] || { title: '', text: '' };
        if (y > 250) { doc.addPage(); pageFrame(4, totalPages, 'NUMEROLOGY (CONT.)'); y = 40; }
        // big italic numeral
        setText(accent);
        doc.setFont('times', 'italic');
        doc.setFontSize(36);
        doc.text(String(it.num), M, y + 9);
        // label + archetype
        setText(text);
        doc.setFont('times', 'normal');
        doc.setFontSize(15);
        doc.text(it.label + (meaning.title ? '  \u00b7  ' + meaning.title : ''), M + 22, y);
        // position framing
        setText(muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text((it.pos || '').toUpperCase(), M + 22, y + 6);
        // meaning paragraph
        setText(text);
        doc.setFont('times', 'normal');
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(meaning.text || '', W - M - (M + 22));
        let yy = y + 12.5;
        for (const ln of lines) { doc.text(ln, M + 22, yy); yy += 5; }
        y = Math.max(yy, y + 24) + 9;
      }

      if (!pname) {
        setText(muted);
        doc.setFont('times', 'italic');
        doc.setFontSize(10.5);
        const note = 'Add your name in the birth profile to unlock the Expression, Soul Urge, and Personality numbers \u2014 the three readings drawn from the letters of a name.';
        for (const ln of doc.splitTextToSize(note, W - 2 * M)) { doc.text(ln, M, y + 2); y += 5.5; }
      }
    }

    // ============== RELATIONSHIPS · VOCATION · RESOURCES · WOUNDS ==============
    {
      const ST = D.SIGN_TEXTS || {};
      const SIGN_FULL = D.SIGN_FULL || {};

      // ---- Relationships ----
      startPage('RELATIONSHIPS');
      bigTitle('Relationships');
      capNote('VENUS · MARS · THE 7TH HOUSE — HOW YOU LOVE, WANT, AND PARTNER.');
      gap(3);
      const vSign = lonToSign(chart.venus.lon).sign;
      subHead('Venus in ' + (SIGN_FULL[vSign] || vSign) + '  —  how you love');
      bodyPara((ST[vSign] || {}).love || '');
      const mSign = lonToSign(chart.mars.lon).sign;
      const mEl = (D.SIGN_ELEMENT || {})[mSign] || '';
      subHead('Mars in ' + (SIGN_FULL[mSign] || mSign) + '  —  how you pursue');
      bodyPara('Mars carries desire and the way you chase it. In ' + (SIGN_FULL[mSign] || mSign) + (mEl ? ', ' + (/^[aeiou]/i.test(mEl) ? 'an ' : 'a ') + mEl.toLowerCase() + ' sign, ' + ((D.ELEMENT_TONE || {})[mEl] || '') : '') + ' — so that is the texture of your wanting, your flirtation, and your fight.');
      const ascSign = lonToSign(chart.ascendant).sign;
      const descSign = SIGNS[(SIGNS.indexOf(ascSign) + 6) % 12];
      const seventh = planetsInHouse(chart, 7);
      subHead('The 7th House  —  the partner you draw');
      bodyPara('Your Descendant falls in ' + (SIGN_FULL[descSign] || descSign) + ' — the qualities you seek in an other, and often first meet as something outside yourself. ' + (seventh.length ? 'With ' + seventh.map(cap).join(', ') + ' here, partnership is a charged, central arena of your life.' : 'No planets sit in the 7th, so relationship is met freely — shaped by your choices rather than by fate.'));

      // ---- Vocation ----
      startPage('VOCATION');
      bigTitle('Vocation & Public Life');
      capNote('THE MIDHEAVEN · THE 10TH HOUSE — YOUR WORK IN THE WORLD.');
      gap(3);
      const mcSign = lonToSign(chart.mc).sign;
      subHead('Midheaven in ' + (SIGN_FULL[mcSign] || mcSign));
      bodyPara((ST[mcSign] || {}).career || '');
      const tenth = planetsInHouse(chart, 10);
      subHead('The 10th House');
      bodyPara(tenth.length ? 'With ' + tenth.map(cap).join(', ') + ' in the 10th, public life and reputation carry real weight — you are seen, and you are meant to be.' : 'No planets sit in the 10th; your public path is built deliberately rather than handed to you, and tends to ripen with time.');
      const satSignV = lonToSign(chart.saturn.lon).sign;
      subHead('Saturn  —  the slow mastery');
      bodyPara('Saturn in ' + (SIGN_FULL[satSignV] || satSignV) + ' marks where authority is earned rather than given. ' + ((ST[satSignV] || {}).career || 'Mastery here is a long arc; what you build slowly becomes unshakeable.'));

      // ---- Resources ----
      startPage('RESOURCES');
      bigTitle('Resources & Money');
      capNote('THE 2ND HOUSE · JUPITER · THE 8TH — WHAT YOU VALUE, GATHER, AND SHARE.');
      gap(3);
      const jSign = lonToSign(chart.jupiter.lon).sign;
      subHead('Jupiter in ' + (SIGN_FULL[jSign] || jSign) + '  —  where abundance flows');
      bodyPara((ST[jSign] || {}).money || '');
      const second = planetsInHouse(chart, 2);
      subHead('The 2nd House  —  what you hold');
      bodyPara(second.length ? 'With ' + second.map(cap).join(', ') + ' in the 2nd, money and possessions are charged ground — a place of both effort and identity.' : 'No planets sit in the 2nd; your relationship to money is shaped less by fate than by the values you choose to live by.');
      const eighth = planetsInHouse(chart, 8);
      subHead('The 8th House  —  shared and hidden resources');
      bodyPara(eighth.length ? 'With ' + eighth.map(cap).join(', ') + ' in the 8th, other people’s money, intimacy, and the deeper exchanges of power are a defining theme.' : 'The 8th house — joint finances, inheritance, debt, and intimacy — runs quietly for you, surfacing mainly through close partnership.');

      // ---- Greatest Wounds ----
      startPage('GREATEST WOUNDS');
      bigTitle('Greatest Wounds');
      capNote('ANCHORED IN SATURN AND THE 12TH HOUSE. THE INVITATION IS TO MEET, NOT BYPASS.');
      gap(3);
      const satSign = lonToSign(chart.saturn.lon).sign;
      subHead('Saturn in ' + (SIGN_FULL[satSign] || satSign));
      bodyPara((ST[satSign] || {}).wounds || '');
      const twelfth = planetsInHouse(chart, 12);
      subHead('The 12th House');
      bodyPara(twelfth.length ? 'With ' + twelfth.map(cap).join(', ') + ' in the 12th, this is material the soul metabolises privately — tended in solitude before it is ever spoken aloud.' : 'No planets sit in the 12th; the hidden, dissolving house runs lightly, and what is unconscious surfaces through dreams, rest, and retreat rather than crisis.');
      subHead('Meeting it');
      bodyPara('A wound is not a verdict. Named, it becomes the exact place you are most able to help others — the gift hidden inside the scar. The work of a life is to stop defending the wound and begin, slowly, to tend it.', { font: ['times', 'italic'], color: muted });
    }

    // ============== PAGE 6 — ASTROCARTOGRAPHY MAP ==============
    doc.addPage();
    pageFrame(6, totalPages, 'ASTROCARTOGRAPHY');

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Astrocartography', M, 34);
    rule(38);

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('PLANET MERIDIANS PROJECTED ACROSS EARTH.  SOLID = MC + AC.  DASHED = IC + DC.', M, 46);

    const mapX = M, mapY = 52, mapW = W - 2 * M, mapH = (W - 2 * M) / 2;
    drawWorldMap(doc, chart, mapX, mapY, mapW, mapH);

    let mly = mapY + mapH + 16;
    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.text('MC line longitudes', M, mly);
    rule(mly + 3, [220, 215, 200]);
    mly += 10;
    doc.setFontSize(9.5);
    for (const k of ['sun','venus','mars','jupiter','saturn']) {
      const p = chart[k];
      let mcLon = p.ra - chart.gmst;
      while (mcLon >  180) mcLon -= 360;
      while (mcLon < -180) mcLon += 360;
      setText(text);
      doc.setFont('times', 'normal');
      doc.text(cap(k), M, mly);
      setText(accent);
      doc.setFont('courier', 'normal');
      const lonStr = (mcLon >= 0 ? '+' : '') + mcLon.toFixed(1) + '°';
      doc.text(lonStr.padStart(7), M + 32, mly);
      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.text(longitudeRegion(mcLon), M + 56, mly);
      mly += 5.5;
    }

    // ============== NATAL ASPECTS ==============
    startPage('NATAL ASPECTS');
    bigTitle('Natal Aspects');
    capNote('THE CONVERSATIONS BETWEEN YOUR PLANETS — THE GEOMETRY THAT SHAPES THE WHOLE.');
    gap(3);
    if (!allAsp.length) {
      bodyPara('No tight natal aspects fall under the canonical orbs — a chart that runs in relatively independent channels, each planet speaking more in its own voice than in chorus.', { font: ['times', 'italic'], color: muted });
    } else {
      for (const a of allAsp.slice(0, 14)) {
        const m = (D.ASPECT_MEANINGS || {})[a.aspect.name] || { label: a.aspect.name.toLowerCase(), line: '' };
        ensure(11);
        setText(text);
        doc.setFont('times', 'normal');
        doc.setFontSize(11.5);
        doc.text(cap(a.a) + ' ' + m.label + ' ' + cap(a.b), M, y);
        setText(muted);
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.text('orb ' + a.exact.toFixed(1) + '°', W - M, y, { align: 'right' });
        y += 5;
        bodyPara(m.line, { font: ['times', 'italic'], color: muted, size: 9.5, lh: 4.4, gapAfter: 3.5 });
      }
    }

    // ============== TRANSITS — TODAY ==============
    startPage('TRANSITS');
    const today = new Date().toISOString().slice(0, 10);
    bigTitle('Transits — ' + today);
    capNote('THE CURRENT SKY MEASURED AGAINST YOUR CHART. TRUE FOR THE DAY THIS WAS CAST.');
    gap(3);
    {
      const sky = computeChart(new Date());
      const transits = findAspects(sky, chart, 0.8).slice(0, 14);
      if (!transits.length) {
        bodyPara('No tight transits are active at this hour — a quiet sky against your chart. Generate the report again on another day and the weather will have shifted.', { font: ['times', 'italic'], color: muted });
      } else {
        for (const a of transits) {
          const m = (D.ASPECT_MEANINGS || {})[a.aspect.name] || { label: a.aspect.name.toLowerCase(), line: '' };
          ensure(8);
          setText(text);
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          doc.text('Transiting ' + cap(a.transit) + (a.retro ? ' (R)' : '') + ' ' + m.label + ' your ' + cap(a.natal), M, y);
          setText(muted);
          doc.setFont('courier', 'normal');
          doc.setFontSize(8);
          doc.text('orb ' + a.exactness.toFixed(1) + '°', W - M, y, { align: 'right' });
          y += 6.5;
        }
        gap(4);
        bodyPara('Transits are the sky in motion touching the fixed chart you were born with. They are timing, not fate — a description of which themes are loud right now.', { font: ['times', 'italic'], color: muted, size: 10 });
      }
    }

    // ============== PAGE 8 (optional) — AI NATAL READING ==============
    if (aiReading && aiReading.length) {
      doc.addPage();
      pageFrame(8, totalPages, 'NATAL READING');

      setText(text);
      doc.setFont('times', 'normal');
      doc.setFontSize(22);
      doc.text('Natal Reading', M, 34);
      rule(38);

      setText(accent);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('GENERATED BY CLAUDE-SONNET-4 FROM THIS CHART', M, 46);

      setText(text);
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      let ry = 60;
      const lineHeight = 5.2;
      const maxWidth = W - 2 * M;
      let pageNum = 8;

      const isLabel = (s) =>
        s.length <= 40 && /[A-Z]/.test(s) && s === s.toUpperCase() && !/[a-z]/.test(s);

      for (const para of aiReading) {
        if (isLabel(para)) {
          // section header — render bold helvetica caps in accent
          if (ry > H - 30) {
            doc.addPage();
            pageNum++;
            pageFrame(pageNum, totalPages, 'NATAL READING (CONT.)');
            ry = 36;
          }
          ry += 4;
          setText(accent);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(para, M, ry);
          ry += 7;
          // restore body style
          setText(text);
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          continue;
        }
        const lines = doc.splitTextToSize(para, maxWidth);
        for (const line of lines) {
          if (ry > H - 24) {
            doc.addPage();
            pageNum++;
            pageFrame(pageNum, totalPages, 'NATAL READING (CONT.)');
            setText(text);
            doc.setFont('times', 'normal');
            doc.setFontSize(11);
            ry = 36;
          }
          doc.text(line, M, ry);
          ry += lineHeight;
        }
        ry += 4;
      }

      if (ry < H - 50) {
        setText(muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        let ny = H - 40;
        doc.text('METHOD', M, ny);
        ny += 6;
        doc.setFontSize(8.5);
        doc.setFont('times', 'italic');
        doc.text(
          "Cast in-browser using Paul Schlyter's simplified planetary formulas. Reading composed by claude-sonnet-4 from the chart data above.",
          M, ny, { maxWidth: W - 2 * M },
        );
      }
    }

    // ============== CLOSING ==============
    startPage('CLOSING');
    bigTitle('A Closing Word');
    bodyPara('A birth chart is not a fixed sentence. It is the shape of the sky at the single moment you arrived — a set of tendencies, weathers, and gifts, never a script. Everything in these pages is raw material. What you make of it is yours alone.', { font: ['times', 'italic'] });
    gap(2);
    bodyPara('Read this report more than once. The parts that feel wrong today are often the parts that matter most a year from now. The chart does not change; your relationship to it does.');
    gap(5);
    capNote('METHOD');
    bodyPara("Cast in-browser from Paul Schlyter's simplified planetary formulas — approximately one degree of accuracy across 1900-2100. Houses use the whole-sign convention. Time zone is derived from longitude (lon/15) and may be up to thirty minutes off in India, Nepal, parts of Australia, or Newfoundland. Archetypes and aspect interpretations draw on traditional, Hellenistic-informed astrology." + (aiReading && aiReading.length ? ' The natal reading was composed by claude-sonnet-4 from this chart.' : ''), { color: muted, size: 9.5 });
    gap(8);
    ensure(16);
    setText(accent);
    doc.setFont('times', 'italic');
    doc.setFontSize(22);
    doc.text('Tajnstvo', M, y);
    y += 6;
    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('CELESTIAL ATLAS  ·  TAJNSTVOTO.COM', M, y);

    // stamp real page numbers across every page (header right)
    const totalP = doc.getNumberOfPages();
    for (let i = 1; i <= totalP; i++) {
      doc.setPage(i);
      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(i + ' / ' + totalP, W - M, 12, { align: 'right' });
    }

    // save
    const slug = ((chart.profile.name || 'native')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')) || 'report';
    doc.save(`tajnstvo-natal-${slug}.pdf`);
    return doc;
  }



window.TajnstvoReport={installUnicodeText,longitudeRegion,natalAspectsFor,hexToRgb,parseSvgPath,CONTINENT_PATHS,PLANET_ABBR,drawChartWheel,drawWorldMap,PDF_NATAL_SYSTEM,fetchPdfNatalReading,REPORT_MODEL,SOUL_REPORT_SYSTEM,fetchSoulReportContent,ASTRO_FONT_B64,loadAstroFont,ZODIAC_GLYPH,BODY_GLYPH_PDF,ASPECT_GLYPH,SIGN_EL,EL_COLOR,generateSoulReport,prettyDate,generatePdfReport};
})();
