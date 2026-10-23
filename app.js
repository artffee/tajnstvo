/* =========================================================
   TAJNSTVO — front-end interactions
   ========================================================= */

(() => {
  'use strict';

  /* ============================================================
     ASTRONOMICAL ENGINE — Schlyter simplified planetary formulas
     ~±1° accuracy, 1900–2100. All in-browser, no ephemerides.
     ============================================================ */

  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  const CITIES = [
    { name: 'London',      lat:  51.5074, lon:   -0.1278, tz:  0   },
    { name: 'New York',    lat:  40.7128, lon:  -74.0060, tz: -5   },
    { name: 'Los Angeles', lat:  34.0522, lon: -118.2437, tz: -8   },
    { name: 'Paris',       lat:  48.8566, lon:    2.3522, tz:  1   },
    { name: 'Berlin',      lat:  52.5200, lon:   13.4050, tz:  1   },
    { name: 'Lisbon',      lat:  38.7223, lon:   -9.1393, tz:  0   },
    { name: 'Tokyo',       lat:  35.6762, lon:  139.6503, tz:  9   },
    { name: 'Sydney',      lat: -33.8688, lon:  151.2093, tz: 10   },
    { name: 'Mumbai',      lat:  19.0760, lon:   72.8777, tz:  5.5 },
    { name: 'São Paulo',   lat: -23.5505, lon:  -46.6333, tz: -3   },
    { name: 'Cape Town',   lat: -33.9249, lon:   18.4241, tz:  2   },
    { name: 'Mexico City', lat:  19.4326, lon:  -99.1332, tz: -6   },
  ];

  // [base, per-day rate]
  const ELEMENTS = {
    mercury: { N:[ 48.3313, 3.24587e-5], i:[7.0047, 5.00e-8 ], w:[ 29.1241, 1.01444e-5], a:[0.387098, 0],          e:[0.205635, 5.59e-10],  M:[168.6562, 4.0923344368] },
    venus:   { N:[ 76.6799, 2.46590e-5], i:[3.3946, 2.75e-8 ], w:[ 54.8910, 1.38374e-5], a:[0.723330, 0],          e:[0.006773,-1.302e-9],  M:[ 48.0052, 1.6021302244] },
    mars:    { N:[ 49.5574, 2.11081e-5], i:[1.8497,-1.78e-8 ], w:[286.5016, 2.92961e-5], a:[1.523688, 0],          e:[0.093405, 2.516e-9],  M:[ 18.6021, 0.5240207766] },
    jupiter: { N:[100.4542, 2.76854e-5], i:[1.3030,-1.557e-7], w:[273.8777, 1.64505e-5], a:[5.20256,  0],          e:[0.048498, 4.469e-9],  M:[ 19.8950, 0.0830853001] },
    saturn:  { N:[113.6634, 2.38980e-5], i:[2.4886,-1.081e-7], w:[339.3939, 2.97661e-5], a:[9.55475,  0],          e:[0.055546,-9.499e-9],  M:[316.9670, 0.0334442282] },
    uranus:  { N:[ 74.0005, 1.3978e-5 ], i:[0.7733, 1.9e-8  ], w:[ 96.6612, 3.0565e-5 ], a:[19.18171,-1.55e-8],    e:[0.047318, 7.45e-9],   M:[142.5905, 0.011725806 ] },
    neptune: { N:[131.7806, 3.0173e-5 ], i:[1.7700,-2.55e-7 ], w:[272.8461,-6.027e-6  ], a:[30.05826, 3.313e-8],   e:[0.008606, 2.15e-9],   M:[260.2471, 0.005995147 ] },
  };

  const PLANET_KEYS  = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune'];
  const PLANET_GLYPH = { sun:'☉', moon:'☾', mercury:'☿', venus:'♀', mars:'♂', jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆' };
  const PLANET_COLOR = {
    sun:'#ffb37a', moon:'#e0d8c0', mercury:'#c8b890', venus:'#e487a4', mars:'#e07060',
    jupiter:'#80b8c8', saturn:'#c8a060', uranus:'#7cc090', neptune:'#4dd6c8',
  };

  const SIGNS = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];

  const ASPECTS_DEFS = [
    { name:'CONJ',    angle:0,   orb:6, tone:'#c8a060' },
    { name:'SEXTILE', angle:60,  orb:4, tone:'#7cc090' },
    { name:'SQUARE',  angle:90,  orb:5, tone:'#e07060' },
    { name:'TRINE',   angle:120, orb:5, tone:'#80b8c8' },
    { name:'OPP',     angle:180, orb:6, tone:'#c870a0' },
  ];

  function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

  function julianDay(date) {
    const Y = date.getUTCFullYear();
    let M = date.getUTCMonth() + 1;
    const D = date.getUTCDate();
    const ut = date.getUTCHours() + date.getUTCMinutes()/60 + date.getUTCSeconds()/3600;
    let yy = Y, mm = M;
    if (mm <= 2) { yy -= 1; mm += 12; }
    const A = Math.floor(yy / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + D + B - 1524.5 + ut/24;
  }
  function schlyterDay(date) { return julianDay(date) - 2451543.5; }
  function gmstDeg(date)     { return norm360(280.46061837 + 360.98564736629 * (julianDay(date) - 2451545.0)); }
  function obliquity(d)      { return (23.4393 - 3.563e-7 * d) * RAD; }

  function solveKepler(Mdeg, e) {
    const M = Mdeg * RAD;
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
    for (let i = 0; i < 8; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-9) break;
    }
    return E;
  }

  function elementsAt(planet, d) {
    const E = ELEMENTS[planet];
    return {
      N: norm360(E.N[0] + E.N[1] * d),
      i: E.i[0] + E.i[1] * d,
      w: norm360(E.w[0] + E.w[1] * d),
      a: E.a[0] + E.a[1] * d,
      e: E.e[0] + E.e[1] * d,
      M: norm360(E.M[0] + E.M[1] * d),
    };
  }

  function eclToEq(x, y, z, eps) {
    const xeq = x;
    const yeq = y * Math.cos(eps) - z * Math.sin(eps);
    const zeq = y * Math.sin(eps) + z * Math.cos(eps);
    return {
      ra:  norm360(Math.atan2(yeq, xeq) * DEG),
      dec: Math.atan2(zeq, Math.sqrt(xeq*xeq + yeq*yeq)) * DEG,
    };
  }

  function geoSun(d) {
    const w = norm360(282.9404 + 4.70935e-5 * d);
    const e = 0.016709 - 1.151e-9 * d;
    const M = norm360(356.0470 + 0.9856002585 * d);
    const E = solveKepler(M, e);
    const xv = Math.cos(E) - e;
    const yv = Math.sqrt(1 - e*e) * Math.sin(E);
    const v = Math.atan2(yv, xv) * DEG;
    const r = Math.sqrt(xv*xv + yv*yv);
    const lon = norm360(v + w);
    const x = r * Math.cos(lon * RAD);
    const y = r * Math.sin(lon * RAD);
    const eq = eclToEq(x, y, 0, obliquity(d));
    return { lon, lat:0, r, x, y, z:0, ra:eq.ra, dec:eq.dec };
  }

  function geoMoon(d) {
    const N = norm360(125.1228 - 0.0529538083 * d);
    const i = 5.1454;
    const w = norm360(318.0634 + 0.1643573223 * d);
    const a = 60.2666;
    const e = 0.054900;
    const M = norm360(115.3654 + 13.0649929509 * d);
    const E = solveKepler(M, e);
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e*e) * Math.sin(E);
    const v = Math.atan2(yv, xv);
    const r = Math.sqrt(xv*xv + yv*yv);
    const Nr = N*RAD, ir = i*RAD, wr = w*RAD;
    const xh = r * (Math.cos(Nr)*Math.cos(v+wr) - Math.sin(Nr)*Math.sin(v+wr)*Math.cos(ir));
    const yh = r * (Math.sin(Nr)*Math.cos(v+wr) + Math.cos(Nr)*Math.sin(v+wr)*Math.cos(ir));
    const zh = r * Math.sin(v+wr) * Math.sin(ir);
    const lon = norm360(Math.atan2(yh, xh) * DEG);
    const lat = Math.atan2(zh, Math.sqrt(xh*xh+yh*yh)) * DEG;
    const eq = eclToEq(xh, yh, zh, obliquity(d));
    return { lon, lat, r, x:xh, y:yh, z:zh, ra:eq.ra, dec:eq.dec };
  }

  function geoPlanet(planet, d) {
    if (planet === 'sun')  return geoSun(d);
    if (planet === 'moon') return geoMoon(d);
    const sun = geoSun(d);
    const el = elementsAt(planet, d);
    const E = solveKepler(el.M, el.e);
    const xv = el.a * (Math.cos(E) - el.e);
    const yv = el.a * Math.sqrt(1 - el.e*el.e) * Math.sin(E);
    const v = Math.atan2(yv, xv);
    const r = Math.sqrt(xv*xv + yv*yv);
    const Nr = el.N*RAD, ir = el.i*RAD, wr = el.w*RAD;
    const xh = r * (Math.cos(Nr)*Math.cos(v+wr) - Math.sin(Nr)*Math.sin(v+wr)*Math.cos(ir));
    const yh = r * (Math.sin(Nr)*Math.cos(v+wr) + Math.cos(Nr)*Math.sin(v+wr)*Math.cos(ir));
    const zh = r * Math.sin(v+wr) * Math.sin(ir);
    const xg = xh + sun.x, yg = yh + sun.y, zg = zh + sun.z;
    const lon = norm360(Math.atan2(yg, xg) * DEG);
    const lat = Math.atan2(zg, Math.sqrt(xg*xg+yg*yg)) * DEG;
    const eq = eclToEq(xg, yg, zg, obliquity(d));
    return { lon, lat, r: Math.sqrt(xg*xg+yg*yg+zg*zg), ra:eq.ra, dec:eq.dec };
  }

  // Pluto — Paul Schlyter's special series (heliocentric ecliptic), valid ~1800-2100,
  // ~±0.5°. Converted to geocentric via the Sun's rectangular coordinates.
  function geoPluto(d) {
    const S = (50.03 + 0.033459652 * d) * RAD;
    const P = (238.95 + 0.003968789 * d) * RAD;
    let lonh = 238.9508 + 0.00400703 * d
      - 19.799 * Math.sin(P)     + 19.848 * Math.cos(P)
      +  0.897 * Math.sin(2 * P) -  4.956 * Math.cos(2 * P)
      +  0.610 * Math.sin(3 * P) +  1.211 * Math.cos(3 * P)
      -  0.341 * Math.sin(4 * P) -  0.190 * Math.cos(4 * P)
      +  0.128 * Math.sin(5 * P) -  0.034 * Math.cos(5 * P)
      -  0.038 * Math.sin(6 * P) +  0.031 * Math.cos(6 * P)
      +  0.020 * Math.sin(S - P) -  0.010 * Math.cos(S - P);
    const lath = -3.9082
      - 5.453 * Math.sin(P)     - 14.975 * Math.cos(P)
      + 3.527 * Math.sin(2 * P) +  1.673 * Math.cos(2 * P)
      - 1.051 * Math.sin(3 * P) +  0.328 * Math.cos(3 * P)
      + 0.179 * Math.sin(4 * P) -  0.292 * Math.cos(4 * P)
      + 0.019 * Math.sin(5 * P) +  0.100 * Math.cos(5 * P)
      - 0.031 * Math.sin(6 * P) +  0.012 * Math.cos(6 * P);
    const r = 40.72
      + 6.68 * Math.sin(P) + 6.90 * Math.cos(P)
      - 1.18 * Math.sin(2 * P) - 0.03 * Math.cos(2 * P)
      + 0.15 * Math.sin(3 * P) - 0.14 * Math.cos(3 * P);
    const lonr = norm360(lonh) * RAD, latr = lath * RAD;
    const xh = r * Math.cos(lonr) * Math.cos(latr);
    const yh = r * Math.sin(lonr) * Math.cos(latr);
    const zh = r * Math.sin(latr);
    const sun = geoSun(d);
    const xg = xh + sun.x, yg = yh + sun.y, zg = zh + sun.z;
    const lon = norm360(Math.atan2(yg, xg) * DEG);
    const lat = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * DEG;
    const eq = eclToEq(xg, yg, zg, obliquity(d));
    return { lon, lat, r: Math.sqrt(xg * xg + yg * yg + zg * zg), ra: eq.ra, dec: eq.dec };
  }

  // Chiron — Keplerian from mean elements (epoch = schlyter day 0, 1999-12-31.0 UT).
  // Approximate (Chiron's orbit is perturbed): good to ~±1-2° for sign/house in the
  // modern era. M0 calibrated so the sign matches reference ephemerides 1950-2050.
  function geoChiron(d) {
    const N = 209.40 * RAD;   // ascending node
    const i = 6.928 * RAD;    // inclination
    const w = 339.43 * RAD;   // argument of perihelion
    const a = 13.7076;        // semi-major axis (AU)
    const e = 0.38312;        // eccentricity
    const n = 0.0195418;      // mean motion (deg/day)
    const M = norm360(23.25 + n * d) * RAD;   // M0 calibrated to reference ephemerides
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
    for (let k = 0; k < 10; k++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-10) break;
    }
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = Math.atan2(yv, xv);
    const r = Math.sqrt(xv * xv + yv * yv);
    const xh = r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i));
    const yh = r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i));
    const zh = r * Math.sin(v + w) * Math.sin(i);
    const sun = geoSun(d);
    const xg = xh + sun.x, yg = yh + sun.y, zg = zh + sun.z;
    const lon = norm360(Math.atan2(yg, xg) * DEG);
    const lat = Math.atan2(zg, Math.sqrt(xg * xg + yg * yg)) * DEG;
    const eq = eclToEq(xg, yg, zg, obliquity(d));
    return { lon, lat, r: Math.sqrt(xg * xg + yg * yg + zg * zg), ra: eq.ra, dec: eq.dec };
  }

  function isRetrograde(planet, d) {
    if (planet === 'sun' || planet === 'moon') return false;
    const fn = planet === 'pluto' ? geoPluto : planet === 'chiron' ? geoChiron : null;
    const a = fn ? fn(d)     : geoPlanet(planet, d);
    const b = fn ? fn(d + 1) : geoPlanet(planet, d + 1);
    let diff = b.lon - a.lon;
    if (diff >  180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
  }

  // Traditional sign rulers + essential dignities (for richer interpretation).
  const SIGN_RULER = {
    Ari:'Mars', Tau:'Venus', Gem:'Mercury', Can:'Moon', Leo:'Sun', Vir:'Mercury',
    Lib:'Venus', Sco:'Mars', Sag:'Jupiter', Cap:'Saturn', Aqu:'Saturn', Pis:'Jupiter',
  };
  // planet -> { domicile:[signs], detriment:[signs], exalt:sign, fall:sign }
  const DIGNITIES = {
    sun:     { domicile:['Leo'],          detriment:['Aqu'],       exalt:'Ari', fall:'Lib' },
    moon:    { domicile:['Can'],          detriment:['Cap'],       exalt:'Tau', fall:'Sco' },
    mercury: { domicile:['Gem','Vir'],    detriment:['Sag','Pis'], exalt:'Vir', fall:'Pis' },
    venus:   { domicile:['Tau','Lib'],    detriment:['Sco','Ari'], exalt:'Pis', fall:'Vir' },
    mars:    { domicile:['Ari','Sco'],    detriment:['Lib','Tau'], exalt:'Cap', fall:'Can' },
    jupiter: { domicile:['Sag','Pis'],    detriment:['Gem','Vir'], exalt:'Can', fall:'Cap' },
    saturn:  { domicile:['Cap','Aqu'],    detriment:['Can','Leo'], exalt:'Lib', fall:'Ari' },
  };
  function dignityOf(planet, sign) {
    const D = DIGNITIES[planet]; if (!D) return null;
    if (D.domicile.includes(sign)) return 'domicile';
    if (D.detriment.includes(sign)) return 'detriment';
    if (D.exalt === sign) return 'exaltation';
    if (D.fall === sign) return 'fall';
    return null;
  }

  function computeAscendant(date, lat, lonEast) {
    const d = schlyterDay(date);
    const lst = norm360(gmstDeg(date) + lonEast) * RAD;
    const eps = obliquity(d);
    const latR = lat * RAD;
    const asc = Math.atan2(-Math.cos(lst), Math.sin(lst)*Math.cos(eps) + Math.tan(latR)*Math.sin(eps));
    return norm360(asc * DEG);
  }
  function computeMC(date, lonEast) {
    const d = schlyterDay(date);
    const lst = norm360(gmstDeg(date) + lonEast) * RAD;
    const eps = obliquity(d);
    return norm360(Math.atan2(Math.sin(lst), Math.cos(lst)*Math.cos(eps)) * DEG);
  }

  function computeChart(date) {
    const d = schlyterDay(date);
    const out = { date, d, gmst: gmstDeg(date) };
    for (const k of PLANET_KEYS) {
      out[k] = geoPlanet(k, d);
      out[k].retro = isRetrograde(k, d);
    }
    return out;
  }

  function profileLocation(profile) {
    if (profile && profile.lat != null && profile.lon != null) {
      return {
        name: profile.cityName || 'Unknown',
        lat:  profile.lat,
        lon:  profile.lon,
        tz:   profile.tz != null ? profile.tz : Math.round(profile.lon / 15),
      };
    }
    // legacy: cityIdx
    if (profile && profile.cityIdx != null) {
      const c = CITIES[profile.cityIdx] || CITIES[0];
      return { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz };
    }
    return CITIES[0];
  }

  function profileToUTC(profile) {
    if (!profile || !profile.birthDate || !profile.birthTime) return null;
    const loc = profileLocation(profile);
    const [yy, mm, dd] = profile.birthDate.split('-').map(Number);
    const [hh, mn] = profile.birthTime.split(':').map(Number);
    const ms = Date.UTC(yy, mm - 1, dd, hh, mn) - loc.tz * 3600 * 1000;
    return new Date(ms);
  }

  // Geocode a free-text city via Nominatim (OpenStreetMap).
  // Falls back to the bundled CITIES table for an exact name match (instant, offline).
  async function geocodeCity(query) {
    const q = (query || '').trim();
    if (!q) throw new Error('Empty');

    // bundled match first
    const lc = q.toLowerCase();
    for (const c of CITIES) {
      if (c.name.toLowerCase() === lc || lc.startsWith(c.name.toLowerCase() + ',')) {
        return { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz };
      }
    }

    // Photon (Komoot) — OSM-based geocoder with public CORS, designed for browser use.
    const url = `https://photon.komoot.io/api?q=${encodeURIComponent(q)}&limit=1&lang=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const f = (data.features || [])[0];
    if (!f || !f.geometry || !f.geometry.coordinates) throw new Error('Not found');
    const [lon, lat] = f.geometry.coordinates;
    if (!isFinite(lat) || !isFinite(lon)) throw new Error('Bad coords');
    const props = f.properties || {};
    const cityPart = props.city || props.name || props.town || props.village || q.split(',')[0].trim();
    const countryPart = props.country || '';
    const short = countryPart ? `${cityPart}, ${countryPart}` : cityPart;
    // approximate timezone: lon/15 rounded. India / Nepal / Newfoundland will be ~30min off.
    const tz = Math.round(lon / 15);
    return { name: short, lat, lon, tz };
  }

  function lonToSign(lon) {
    const v = norm360(lon);
    const idx = Math.floor(v / 30) % 12;
    const deg = v - idx * 30;
    return { sign: SIGNS[idx], deg, str: `${SIGNS[idx]} ${Math.floor(deg).toString().padStart(2,'0')}°` };
  }

  // Pythagorean life path number from a YYYY-MM-DD date.
  // Single-digit reduction except master numbers 11, 22, 33.
  function lifePathNumber(birthDate) {
    if (!birthDate) return null;
    const digits = birthDate.replace(/-/g, '').split('').map(d => parseInt(d, 10));
    let sum = digits.reduce((a, b) => a + b, 0);
    while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
      sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
    }
    return sum;
  }

  // Mean lunar ascending node (north node), Schlyter formula.
  function meanLunarNorthNode(d) {
    return norm360(125.1228 - 0.0529538083 * d);
  }

  // ---- numerology ----
  function reduceNumber(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((a, b) => a + Number(b), 0);
    }
    return n;
  }
  const PYTH = { a:1,j:1,s:1, b:2,k:2,t:2, c:3,l:3,u:3, d:4,m:4,v:4, e:5,n:5,w:5,
                 f:6,o:6,x:6, g:7,p:7,y:7, h:8,q:8,z:8, i:9,r:9 };
  function nameNumber(name, mode) {
    const vowels = 'aeiou';
    let sum = 0;
    for (const ch of (name || '').toLowerCase()) {
      if (!PYTH[ch]) continue;
      const isVowel = vowels.includes(ch);
      if (mode === 'vowels' && !isVowel) continue;
      if (mode === 'consonants' && isVowel) continue;
      sum += PYTH[ch];
    }
    return sum ? reduceNumber(sum) : null;
  }
  function birthdayNumber(birthDate) {
    if (!birthDate) return null;
    const day = parseInt(birthDate.split('-')[2], 10);
    return isFinite(day) ? reduceNumber(day) : null;
  }

  // Whole-sign house of a planet given the ascendant longitude.
  // 1st house = sign of Asc, 2nd = next sign, etc.
  function houseOfPlanet(planetLon, ascLon) {
    const ascSign    = Math.floor(norm360(ascLon)    / 30);
    const planetSign = Math.floor(norm360(planetLon) / 30);
    let h = planetSign - ascSign + 1;
    if (h <= 0) h += 12;
    return h;
  }

  function planetsInHouse(chart, houseNum) {
    const out = [];
    for (const k of ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune']) {
      const p = chart[k];
      if (p && houseOfPlanet(p.lon, chart.ascendant) === houseNum) out.push(k);
    }
    return out;
  }

  function findAspects(transit, natal, orbScale = 1) {
    const out = [];
    for (const tk of PLANET_KEYS) {
      const tBody = transit[tk]; if (!tBody) continue;
      for (const nk of PLANET_KEYS) {
        const nBody = natal[nk]; if (!nBody) continue;
        let diff = Math.abs(tBody.lon - nBody.lon);
        if (diff > 180) diff = 360 - diff;
        for (const a of ASPECTS_DEFS) {
          const off = Math.abs(diff - a.angle);
          if (off <= a.orb * orbScale) {
            out.push({ transit: tk, natal: nk, aspect: a, exactness: off, retro: tBody.retro });
          }
        }
      }
    }
    out.sort((a, b) => a.exactness - b.exactness);
    return out;
  }


  /* ============================================================
     STATE — profile + API key + reactive recompute
     ============================================================ */

  const STORAGE_KEY = 'astra-arcana:profile';
  const APIKEY_KEY  = 'astra-arcana:apiKey';

  // Profile lives in memory only — no persistence. Each session starts fresh.
  // Any leftover legacy storage from earlier versions is cleared on load.
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  let currentProfile = null;

  function readProfile() { return currentProfile; }
  function writeProfile(p) { currentProfile = p; }

  function readApiKey() {
    try { return localStorage.getItem(APIKEY_KEY) || ''; }
    catch { return ''; }
  }
  function writeApiKey(v) {
    try { if (v) localStorage.setItem(APIKEY_KEY, v); else localStorage.removeItem(APIKEY_KEY); } catch {}
  }

  function getNatalChart() {
    const p = readProfile();
    if (!p) return null;
    const utc = profileToUTC(p);
    if (!utc || isNaN(utc.getTime())) return null;
    const loc = profileLocation(p);
    const chart = computeChart(utc);
    chart.profile = p;
    chart.city = loc;
    chart.ascendant = computeAscendant(utc, loc.lat, loc.lon);
    chart.mc        = computeMC(utc, loc.lon);
    chart.lifePath  = lifePathNumber(p.birthDate);
    chart.northNode = meanLunarNorthNode(chart.d);
    const pl = geoPluto(chart.d);    pl.retro = isRetrograde('pluto', chart.d);   chart.pluto  = pl;
    const ch = geoChiron(chart.d);   ch.retro = isRetrograde('chiron', chart.d);  chart.chiron = ch;
    return chart;
  }

  // Format chart as a compact human-readable summary.
  function summarizeChart(chart) {
    if (!chart) return '';
    const lines = [];
    lines.push(`Native: ${chart.profile.name || 'Unnamed'} · ${chart.profile.birthDate} ${chart.profile.birthTime} · ${chart.city.name}`);
    lines.push('Placements:');
    for (const k of PLANET_KEYS) {
      const p = chart[k]; if (!p) continue;
      lines.push(`  ${k.padEnd(8)} ${lonToSign(p.lon).str}${p.retro ? ' (retrograde)' : ''}`);
    }
    lines.push(`  Asc      ${lonToSign(chart.ascendant).str}`);
    lines.push(`  MC       ${lonToSign(chart.mc).str}`);
    return lines.join('\n');
  }

  /* ============================================================
     SOUL REPORT — chart facts, aspects, stelliae (feed Claude + renderer)
     ============================================================ */

  const REPORT_KEYS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron'];
  const BODY_NAME = { sun:'Sun', moon:'Moon', mercury:'Mercury', venus:'Venus', mars:'Mars',
    jupiter:'Jupiter', saturn:'Saturn', uranus:'Uranus', neptune:'Neptune', pluto:'Pluto', chiron:'Chiron' };
  function ordinal(n) { return n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'); }

  function nodeAxis(chart) {
    const nLon = norm360(chart.northNode);
    const sLon = norm360(nLon + 180);
    return {
      north: { lon: nLon, sign: lonToSign(nLon), house: houseOfPlanet(nLon, chart.ascendant) },
      south: { lon: sLon, sign: lonToSign(sLon), house: houseOfPlanet(sLon, chart.ascendant) },
    };
  }

  // Aspects among all report bodies (Sun..Neptune + Pluto + Chiron), tightest first.
  function reportAspects(chart) {
    const keys = REPORT_KEYS.filter(k => chart[k]);
    const out = [];
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
      let diff = Math.abs(chart[keys[a]].lon - chart[keys[b]].lon);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECTS_DEFS) {
        const off = Math.abs(diff - def.angle);
        if (off <= def.orb) out.push({ a: keys[a], b: keys[b], aspect: def, orb: off });
      }
    }
    out.sort((x, y) => x.orb - y.orb);
    return out;
  }

  // Houses holding two or more bodies (loose stellia), largest first.
  function stelliaeOf(chart) {
    const byHouse = {};
    for (const k of REPORT_KEYS) {
      if (!chart[k]) continue;
      const h = houseOfPlanet(chart[k].lon, chart.ascendant);
      (byHouse[h] = byHouse[h] || []).push(k);
    }
    return Object.keys(byHouse).map(h => ({ house: +h, bodies: byHouse[h] }))
      .filter(s => s.bodies.length >= 2)
      .sort((a, b) => b.bodies.length - a.bodies.length || a.house - b.house);
  }

  // Geographic longitude of a body's MC line (where it culminates).
  function mcLineLon(chart, k) {
    const p = chart[k]; if (!p) return null;
    let m = p.ra - chart.gmst;
    while (m > 180) m -= 360;
    while (m < -180) m += 360;
    return m;
  }

  // Life Path reduction chain, e.g. {dmy:'8 + 10 + 1992', digits:'8 + 1 + 0 + 1 + 9 + 9 + 2', chain:[30,3], number:3}
  function lifePathSteps(birthDate) {
    if (!birthDate) return null;
    const [y, m, d] = birthDate.split('-');
    const dmy = `${+d} + ${+m} + ${y}`;
    const allDigits = (String(+d) + String(+m) + y).split('').map(Number);
    const digits = allDigits.join(' + ');
    let n = allDigits.reduce((a, b) => a + b, 0);
    const chain = [n];
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce((a, b) => a + Number(b), 0);
      chain.push(n);
    }
    return { dmy, digits, chain, number: n };
  }

  // A dense, accurate fact sheet for the language model — the more grounded the
  // facts, the more chart-specific (non-generic) the prose it can write.
  function buildChartFacts(chart) {
    const L = [];
    const p = chart.profile;
    L.push(`NATIVE: ${p.name || 'Unnamed'} · born ${p.birthDate} at ${p.birthTime} local · ${chart.city.name} (${chart.city.lat.toFixed(2)}, ${chart.city.lon.toFixed(2)})`);
    L.push('');
    L.push('PLACEMENTS (sign, degree, whole-sign house, dignity, retrograde):');
    const angles = { ascendant: 'Ascendant', mc: 'Midheaven' };
    for (const k of REPORT_KEYS) {
      const b = chart[k]; if (!b) continue;
      const s = lonToSign(b.lon);
      const house = houseOfPlanet(b.lon, chart.ascendant);
      const dig = dignityOf(k, s.sign);
      const bits = [`${BODY_NAME[k]}: ${s.sign} ${s.deg.toFixed(1)}°`, `${ordinal(house)} house`];
      if (dig) bits.push(dig);
      if (b.retro) bits.push('retrograde');
      L.push('  ' + bits.join(' · '));
    }
    const asc = lonToSign(chart.ascendant), mc = lonToSign(chart.mc);
    L.push(`  Ascendant: ${asc.sign} ${asc.deg.toFixed(1)}° (ruled by ${SIGN_RULER[asc.sign]})`);
    L.push(`  Midheaven: ${mc.sign} ${mc.deg.toFixed(1)}° (ruled by ${SIGN_RULER[mc.sign]})`);

    // chart-ruler + Moon dispositor
    L.push('');
    L.push('RULERSHIP NOTES:');
    L.push(`  Chart ruler (ruler of the Ascendant sign): ${SIGN_RULER[asc.sign]} — placed in ${lonToSign(chart[SIGN_RULER[asc.sign].toLowerCase()] ? chart[SIGN_RULER[asc.sign].toLowerCase()].lon : chart.ascendant).sign}.`);
    const moonSign = lonToSign(chart.moon.lon).sign;
    L.push(`  The Moon is in ${moonSign}, so it is dispositied by ${SIGN_RULER[moonSign]}.`);

    // conjunctions to the angles
    const angleHits = [];
    for (const k of REPORT_KEYS) {
      const b = chart[k]; if (!b) continue;
      for (const [ang, lon] of [['Ascendant', chart.ascendant], ['Midheaven', chart.mc], ['Descendant', norm360(chart.ascendant + 180)], ['IC', norm360(chart.mc + 180)]]) {
        let dd = Math.abs(b.lon - lon); if (dd > 180) dd = 360 - dd;
        if (dd <= 6) angleHits.push(`${BODY_NAME[k]} conjunct the ${ang} (orb ${dd.toFixed(1)}°)`);
      }
    }
    if (angleHits.length) { L.push(''); L.push('BODIES ON THE ANGLES: ' + angleHits.join('; ') + '.'); }

    // nodes
    const nodes = nodeAxis(chart);
    L.push('');
    L.push(`NODES: North Node ${nodes.north.sign.sign} ${nodes.north.sign.deg.toFixed(1)}° (${ordinal(nodes.north.house)} house); South Node ${nodes.south.sign.sign} ${nodes.south.sign.deg.toFixed(1)}° (${ordinal(nodes.south.house)} house).`);

    // aspects
    const asps = reportAspects(chart).slice(0, 16);
    L.push('');
    L.push('MAJOR ASPECTS (tightest first):');
    for (const a of asps) L.push(`  ${BODY_NAME[a.a]} ${a.aspect.name.toLowerCase()} ${BODY_NAME[a.b]} (orb ${a.orb.toFixed(1)}°)`);

    // stelliae
    const stel = stelliaeOf(chart);
    if (stel.length) {
      L.push('');
      L.push('HOUSE GROUPINGS: ' + stel.map(s => `${ordinal(s.house)} house — ${s.bodies.map(k => BODY_NAME[k]).join(', ')}`).join('; ') + '.');
    }

    // numerology
    const lp = lifePathSteps(p.birthDate);
    if (lp) { L.push(''); L.push(`NUMEROLOGY: Life Path ${lp.number} (${lp.dmy} → ${lp.digits} → ${lp.chain.join(' → ')}).`); }

    // astrocartography MC lines
    L.push('');
    L.push('ASTROCARTOGRAPHY (geographic longitude of each body\'s MC/culmination line; pick 3 evocative real cities near these):');
    for (const k of ['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn']) {
      const ml = mcLineLon(chart, k);
      if (ml != null) L.push(`  ${BODY_NAME[k]} MC line at longitude ${ml >= 0 ? '+' : ''}${ml.toFixed(0)}°`);
    }

    // today's transits
    try {
      const today = computeChart(new Date());
      const tr = findAspects(today, chart, 0.8).slice(0, 6);
      if (tr.length) {
        L.push('');
        L.push(`TODAY'S TRANSITS (${new Date().toISOString().slice(0, 10)}):`);
        for (const t of tr) L.push(`  Transiting ${BODY_NAME[t.transit] || t.transit}${t.retro ? ' (retrograde)' : ''} ${t.aspect.name.toLowerCase()} natal ${BODY_NAME[t.natal] || t.natal} (orb ${t.exactness.toFixed(1)}°)`);
      }
    } catch (e) {}

    return L.join('\n');
  }


  /* ---------- starfield ---------- */
  const sky = document.getElementById('starfield');
  const ctx = sky.getContext('2d');
  let stars = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeSky() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sky.width  = window.innerWidth  * dpr;
    sky.height = window.innerHeight * dpr;
    sky.style.width  = window.innerWidth  + 'px';
    sky.style.height = window.innerHeight + 'px';

    const count = Math.min(220, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * sky.width,
      y: Math.random() * sky.height,
      r: (Math.random() * 1.2 + 0.2) * dpr,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      hue: Math.random() < 0.85 ? 'cream' : (Math.random() < 0.5 ? 'amber' : 'cyan'),
    }));
  }

  function drawSky(t) {
    ctx.clearRect(0, 0, sky.width, sky.height);
    const time = t * 0.001;
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      const color =
        s.hue === 'amber' ? '255, 175, 110' :
        s.hue === 'cyan'  ? '160, 230, 220' :
                            '236, 232, 223';
      ctx.fillStyle = `rgba(${color}, ${0.6 * tw + 0.2})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(drawSky);
  }

  resizeSky();
  requestAnimationFrame(drawSky);
  window.addEventListener('resize', resizeSky);


  /* ---------- live time ---------- */
  const timeEl = document.getElementById('liveTime');
  function tick() {
    const d = new Date();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    if (timeEl) timeEl.textContent = `${hh}:${mm} UTC`;
  }
  tick(); setInterval(tick, 30 * 1000);


  /* ---------- profile persistence ---------- */
  const profileForm = document.getElementById('profileForm');
  const profileNote = document.getElementById('profileNote');

  function loadProfile() { /* no-op: nothing is persisted any more */ }

  function flashNote(msg, tone) {
    if (!profileNote) return;
    profileNote.textContent = msg;
    profileNote.style.color = tone === 'warn' ? '#ff8c42' : '#4dd6c8';
  }

  /* ---------- paywall (Stripe Payment Links) ---------- */
  // EDIT THESE: paste your 3 Stripe Payment Link URLs from the Stripe dashboard.
  // For each link set the post-payment redirect (Stripe: 'After payment' -> 'Redirect') to:
  //   star map -> https://tajnstvoto.com/?unlock=starmap
  //   report   -> https://tajnstvoto.com/?unlock=report
  //   bundle   -> https://tajnstvoto.com/?unlock=bundle
  const PAYMENT_LINKS = {
    starmap: 'PASTE_STRIPE_STARMAP_LINK',
    report:  'PASTE_STRIPE_REPORT_LINK',
    bundle:  'PASTE_STRIPE_BUNDLE_LINK',
  };
  const PRICES = { starmap: 9, report: 15, bundle: 19 };
  const PENDING_KEY = 'tajnstvo:pending';

  function isUnlocked(prod) {
    try {
      return localStorage.getItem('tajnstvo:unlock:' + prod) === '1'
          || localStorage.getItem('tajnstvo:unlock:bundle') === '1';
    } catch (_) { return false; }
  }
  function unlockProduct(prod) {
    try {
      localStorage.setItem('tajnstvo:unlock:' + prod, '1');
      if (prod === 'bundle') {
        localStorage.setItem('tajnstvo:unlock:starmap', '1');
        localStorage.setItem('tajnstvo:unlock:report', '1');
      }
    } catch (_) {}
  }
  function savePendingFromForm() {
    try {
      const d = Object.fromEntries(new FormData(profileForm).entries());
      localStorage.setItem(PENDING_KEY, JSON.stringify(d));
    } catch (_) {}
  }
  function restorePendingToForm() {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.name)      profileForm.elements.name.value = d.name;
      if (d.birthDate) profileForm.elements.birthDate.value = d.birthDate;
      if (d.birthTime) profileForm.elements.birthTime.value = d.birthTime;
      if (d.cityName)  profileForm.elements.cityName.value = d.cityName;
      return true;
    } catch (_) { return false; }
  }
  function openCheckout(prod) {
    const url = PAYMENT_LINKS[prod];
    if (!url || url.indexOf('PASTE') === 0) {
      flashNote('PAYMENT LINK NOT SET YET', 'warn');
      return false;
    }
    savePendingFromForm();
    window.location.href = url;
    return true;
  }
  function refreshPaywallUI() {
    const submitBtn = profileForm && profileForm.querySelector('button[type="submit"]');
    const starMapBtn = document.getElementById('starMapBtn');
    const bundle = document.getElementById('bundleUnlock');
    if (submitBtn) submitBtn.textContent = isUnlocked('report') ? '\u25b8 Download your Soul Report' : ('\u25b8 Generate my Soul Report \u00b7 $' + PRICES.report);
    if (starMapBtn) starMapBtn.textContent = isUnlocked('starmap') ? '\u2605 Download star map' : ('\u2605 Just the star map \u00b7 $' + PRICES.starmap);
    if (bundle) {
      const both = isUnlocked('starmap') && isUnlocked('report');
      bundle.hidden = both;
      bundle.textContent = 'Unlock both for $' + PRICES.bundle + ' \u2192';
    }
  }

  function formReady() {
    const d = Object.fromEntries(new FormData(profileForm).entries());
    if (!(d.cityName || '').trim()) { flashNote('CITY OF BIRTH REQUIRED', 'warn'); return false; }
    if (!d.birthDate || !d.birthTime) { flashNote('DATE AND TIME REQUIRED', 'warn'); return false; }
    return true;
  }

  async function castFromForm() {
    const data = Object.fromEntries(new FormData(profileForm).entries());
    const loc = await geocodeCity((data.cityName || '').trim());
    writeProfile({ name: data.name, birthDate: data.birthDate, birthTime: data.birthTime,
      cityName: loc.name, lat: loc.lat, lon: loc.lon, tz: loc.tz });
    profileForm.elements.cityName.value = loc.name;
    refreshAll();
  }

  // Return the current chart, or build one from the hero form (geocode + compute)
  // if none exists yet. Lets secondary features (e.g. the 45-day program) run off
  // the birth form directly instead of asking the user to "save a profile" first.
  async function ensureChartFromForm() {
    const existing = getNatalChart();
    if (existing) return existing;
    if (!formReady()) return null;
    await castFromForm();
    return getNatalChart();
  }

  async function runReportDownload() {
    if (!formReady()) return;
    if (!window.jspdf || !window.jspdf.jsPDF) { flashNote('PDF LIBRARY NOT LOADED', 'warn'); return; }
    if (!isUnlocked('report')) { flashNote('REDIRECTING TO SECURE CHECKOUT \u2026'); openCheckout('report'); return; }
    if (!readApiKey()) {
      flashNote('ADD YOUR ANTHROPIC API KEY (TOP RIGHT) TO WRITE THE REPORT', 'warn');
      const trig = document.getElementById('apiKeyTrigger');
      if (trig && trig.getAttribute('aria-expanded') !== 'true') trig.click();
      return;
    }
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Geocoding\u2026'; }
    flashNote('GEOCODING CITY \u2026');
    try { await castFromForm(); }
    catch (err) { flashNote('COULD NOT FIND CITY \u00b7 ' + (err.message || '').toUpperCase(), 'warn'); if (submitBtn) submitBtn.disabled = false; refreshPaywallUI(); return; }
    try {
      const chart = getNatalChart();
      if (!chart) throw new Error('Could not compute chart');
      if (submitBtn) submitBtn.textContent = 'Reading the chart\u2026';
      flashNote('READING THE CHART \u00b7 CLAUDE \u00b7 ~30-60 SEC');
      const content = await fetchSoulReportContent(chart);
      if (submitBtn) submitBtn.textContent = 'Composing PDF\u2026';
      flashNote('COMPOSING YOUR SOUL REPORT \u2026');
      await generateSoulReport(chart, content);
      flashNote('SOUL REPORT DOWNLOADED \u00b7 ' + (chart.profile.name || 'NATIVE').toUpperCase());
    } catch (err) {
      const msg = (err && err.message) || 'unknown';
      if (msg === 'NO_KEY') flashNote('ADD YOUR ANTHROPIC API KEY (TOP RIGHT)', 'warn');
      else flashNote('REPORT FAILED \u00b7 ' + msg.toUpperCase(), 'warn');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      refreshPaywallUI();
    }
  }

  async function runStarMapDownload() {
    if (!formReady()) return;
    if (!window.tajnstvoStarMap) { flashNote('STAR MAP MODULE NOT LOADED', 'warn'); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { flashNote('PDF LIBRARY NOT LOADED', 'warn'); return; }
    if (!isUnlocked('starmap')) { flashNote('REDIRECTING TO SECURE CHECKOUT \u2026'); openCheckout('starmap'); return; }
    const starMapBtn = document.getElementById('starMapBtn');
    if (starMapBtn) { starMapBtn.disabled = true; starMapBtn.textContent = 'Geocoding\u2026'; }
    flashNote('GEOCODING CITY \u2026');
    try { await castFromForm(); }
    catch (err) { flashNote('COULD NOT FIND CITY \u00b7 ' + (err.message || '').toUpperCase(), 'warn'); if (starMapBtn) starMapBtn.disabled = false; refreshPaywallUI(); return; }
    if (starMapBtn) starMapBtn.textContent = 'Drawing the sky\u2026';
    flashNote('DRAWING THE NIGHT SKY \u2026');
    try {
      const chart = getNatalChart();
      if (!chart) throw new Error('Could not compute chart');
      window.tajnstvoStarMap(chart);
      flashNote('STAR MAP DOWNLOADED \u00b7 ' + (chart.profile.name || 'NATIVE').toUpperCase());
    } catch (err) {
      flashNote('STAR MAP FAILED \u00b7 ' + (err.message || '').toUpperCase(), 'warn');
    } finally {
      if (starMapBtn) starMapBtn.disabled = false;
      refreshPaywallUI();
    }
  }

  if (profileForm) {
    profileForm.addEventListener('submit', (e) => { e.preventDefault(); runReportDownload(); });
    const starMapBtn = document.getElementById('starMapBtn');
    if (starMapBtn) starMapBtn.addEventListener('click', () => runStarMapDownload());
    const bundle = document.getElementById('bundleUnlock');
    if (bundle) bundle.addEventListener('click', (e) => { e.preventDefault(); openCheckout('bundle'); });

    // return from Stripe checkout: ?unlock=starmap|report|bundle
    (function handleUnlockReturn() {
      const params = new URLSearchParams(location.search);
      const u = params.get('unlock');
      if (u && ['starmap', 'report', 'bundle'].indexOf(u) !== -1) {
        unlockProduct(u);
        params.delete('unlock');
        const clean = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
        history.replaceState({}, '', clean);
        restorePendingToForm();
        flashNote('\u2713 UNLOCKED \u00b7 ' + u.toUpperCase() + ' \u2014 GENERATING \u2026');
        setTimeout(() => {
          if (u === 'report') runReportDownload();
          else if (u === 'starmap') runStarMapDownload();
        }, 500);
      }
    })();

    refreshPaywallUI();
    loadProfile();
  }


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

  function prettyDate(iso) {
    if (!iso) return '';
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [y, m, d] = iso.split('-').map(Number);
    return (d || '') + ' ' + (months[(m || 1) - 1] || '') + ' ' + (y || '');
  }

  async function generatePdfReport(chart, aiReading) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
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


  /* ---------- astrocartography world map ---------- */
  // simplified continental outlines as rough polygon paths in lon/lat space.
  // not geographically perfect — matches the "Schlyter ±1°" register described in the spec.
  const continents = [
    // North America
    "M -168 70 L -160 71 L -140 72 L -100 75 L -80 75 L -55 70 L -52 60 L -65 50 L -65 45 L -75 38 L -80 30 L -90 28 L -95 30 L -110 30 L -115 25 L -125 35 L -125 50 L -135 58 L -150 60 L -165 60 Z",
    // Greenland
    "M -50 82 L -22 82 L -22 70 L -45 60 L -50 70 Z",
    // South America
    "M -82 12 L -70 11 L -55 5 L -45 -5 L -38 -10 L -38 -25 L -55 -38 L -65 -50 L -70 -55 L -75 -52 L -80 -40 L -78 -20 L -82 -5 Z",
    // Europe
    "M -10 36 L 0 38 L 10 38 L 25 36 L 40 40 L 60 50 L 60 70 L 30 72 L 5 70 L -10 60 L -10 50 Z",
    // Africa
    "M -18 35 L 10 35 L 30 33 L 42 12 L 50 5 L 52 -5 L 38 -25 L 25 -35 L 18 -35 L 10 -32 L 5 -10 L -10 5 L -18 18 Z",
    // Middle East / Arabia carve
    "M 32 30 L 55 28 L 60 18 L 55 12 L 45 14 L 38 22 Z",
    // Asia
    "M 30 70 L 60 72 L 100 75 L 140 70 L 175 70 L 180 60 L 145 50 L 130 35 L 120 22 L 105 12 L 95 8 L 88 22 L 75 30 L 60 30 L 50 35 L 40 50 L 30 60 Z",
    // India
    "M 70 32 L 88 30 L 90 22 L 80 8 L 72 22 Z",
    // SE Asia / Indonesia
    "M 95 5 L 120 8 L 140 -5 L 130 -10 L 110 -8 L 95 -2 Z",
    // Australia
    "M 113 -12 L 140 -12 L 153 -25 L 150 -38 L 130 -38 L 115 -32 L 113 -22 Z",
    // Antarctica strip (simplified)
    "M -180 -78 L 180 -78 L 180 -84 L -180 -84 Z",
  ];

  // Default fallback when no profile is saved.
  let planetsForMap = {
    sun:     { glyph: '☉', color: '#ffb37a', mc: -22,  dec: 11.3 },
    venus:   { glyph: '♀', color: '#e487a4', mc:  48,  dec: 19.0 },
    mars:    { glyph: '♂', color: '#e07060', mc:  88,  dec: -8.5 },
    jupiter: { glyph: '♃', color: '#80b8c8', mc: -110, dec: 22.4 },
    saturn:  { glyph: '♄', color: '#c8a060', mc: 140,  dec: -14.0 },
  };

  function recomputePlanetsForMap() {
    const natal = getNatalChart();
    if (!natal) return false;
    const out = {};
    for (const k of ['sun','venus','mars','jupiter','saturn']) {
      const p = natal[k];
      let mc = p.ra - natal.gmst;
      while (mc >  180) mc -= 360;
      while (mc < -180) mc += 360;
      out[k] = { glyph: PLANET_GLYPH[k], color: PLANET_COLOR[k], mc, dec: p.dec };
    }
    planetsForMap = out;
    return true;
  }

  const ACTIVE = new Set(['sun', 'venus', 'mars']);
  const mapEl  = document.getElementById('worldMap');

  function lonLatToXY(lon, lat, w, h) {
    const x = ((lon + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return [x, y];
  }

  function continentsToScreenPath(lonLatPath, w, h) {
    return lonLatPath.replace(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
      (_, cmd, lon, lat) => {
        const [x, y] = lonLatToXY(parseFloat(lon), parseFloat(lat), w, h);
        return `${cmd} ${x.toFixed(1)} ${y.toFixed(1)}`;
      });
  }

  function buildAcDcPath(mc, dec, w, h) {
    // λ = α ± H − θ ; cos H = -tan φ · tan δ
    // We use mc as the (α − θ) shorthand so the AC/DC curves anchor to the MC.
    const decRad = dec * Math.PI / 180;
    const tanDec = Math.tan(decRad);
    const ptsRise = [];
    const ptsSet  = [];
    for (let lat = -84; lat <= 84; lat += 2) {
      const phiRad = lat * Math.PI / 180;
      const cosH = -Math.tan(phiRad) * tanDec;
      if (cosH < -1 || cosH > 1) continue; // body never rises/sets at this latitude
      const H = Math.acos(cosH) * 180 / Math.PI;
      let lonRise = mc - H;
      let lonSet  = mc + H;
      lonRise = ((lonRise + 540) % 360) - 180;
      lonSet  = ((lonSet  + 540) % 360) - 180;
      ptsRise.push([lonRise, lat]);
      ptsSet.push([lonSet, lat]);
    }
    function toPath(pts) {
      if (!pts.length) return '';
      // break into segments where lon wraps
      const segs = [];
      let cur = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        if (Math.abs(pts[i][0] - pts[i-1][0]) > 180) {
          segs.push(cur); cur = [];
        }
        cur.push(pts[i]);
      }
      if (cur.length) segs.push(cur);
      return segs.map(seg => seg.map(([lon, lat], i) => {
        const [x, y] = lonLatToXY(lon, lat, w, h);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')).join(' ');
    }
    return { rise: toPath(ptsRise), set: toPath(ptsSet) };
  }

  function renderMap() {
    const w = 1200, h = 600;
    const land = continents
      .map(p => `<path d="${continentsToScreenPath(p, w, h)}" />`)
      .join('');

    // grid (graticule)
    const grid = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = lonLatToXY(lon, 0, w, h);
      grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" />`);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = lonLatToXY(0, lat, w, h);
      grid.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" />`);
    }

    // planet lines
    const lines = [];
    for (const [key, body] of Object.entries(planetsForMap)) {
      if (!ACTIVE.has(key)) continue;
      const [xMc] = lonLatToXY(body.mc, 0, w, h);
      const ic = ((body.mc + 360) % 360) - 180; // opposite meridian
      const icLon = body.mc + 180 > 180 ? body.mc - 180 : body.mc + 180;
      const [xIc] = lonLatToXY(icLon, 0, w, h);

      // MC solid
      lines.push(`<line x1="${xMc}" y1="0" x2="${xMc}" y2="${h}" stroke="${body.color}" stroke-width="1.4" opacity="0.9"/>`);
      // IC dashed
      lines.push(`<line x1="${xIc}" y1="0" x2="${xIc}" y2="${h}" stroke="${body.color}" stroke-width="1.2" opacity="0.55" stroke-dasharray="4 5"/>`);

      // labels
      lines.push(`<text x="${xMc + 6}" y="18" fill="${body.color}" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2">${body.glyph} MC</text>`);
      lines.push(`<text x="${xIc + 6}" y="${h - 8}" fill="${body.color}" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="2" opacity="0.7">${body.glyph} IC</text>`);

      // AC / DC parametric
      const { rise, set } = buildAcDcPath(body.mc, body.dec, w, h);
      if (rise) lines.push(`<path d="${rise}" stroke="${body.color}" stroke-width="1.2" fill="none" opacity="0.85"/>`);
      if (set)  lines.push(`<path d="${set}"  stroke="${body.color}" stroke-width="1.0" fill="none" opacity="0.55" stroke-dasharray="4 5"/>`);
    }

    mapEl.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Astrocartography world map">
        <g stroke="#1f2330" stroke-width="0.8" fill="none">${grid.join('')}</g>
        <g fill="#0f1219" stroke="#2a2f3e" stroke-width="0.7">${land}</g>
        <g>${lines.join('')}</g>
      </svg>
    `;
  }

  document.querySelectorAll('.chip[data-planet]').forEach(chip => {
    chip.addEventListener('click', () => {
      const k = chip.dataset.planet;
      if (ACTIVE.has(k)) { ACTIVE.delete(k); chip.classList.remove('is-on'); }
      else { ACTIVE.add(k); chip.classList.add('is-on'); }
      renderMap();
    });
  });

  if (mapEl) renderMap();


  /* ---------- live sky ticker ---------- */
  function refreshSky() {
    const now = new Date();
    const d = schlyterDay(now);
    const upd = (key) => {
      const el = document.querySelector(`[data-sky="${key}"]`);
      if (!el) return;
      const body = geoPlanet(key, d);
      const retro = isRetrograde(key, d);
      const { str } = lonToSign(body.lon);
      el.textContent = `— ${str}${retro ? ' ℞' : ''}`;
    };
    upd('sun'); upd('moon'); upd('mercury'); upd('venus'); upd('mars');
  }
  refreshSky();
  setInterval(refreshSky, 5 * 60 * 1000);


  /* ---------- transit list (live) ---------- */
  function renderTransitList() {
    const ul = document.querySelector('.aspects-list');
    if (!ul) return;
    const natal = getNatalChart();
    if (!natal) return; // keep static demo markup if no profile yet
    const sky = computeChart(new Date());
    const aspects = findAspects(sky, natal, 0.7).slice(0, 6);
    if (!aspects.length) {
      ul.innerHTML = '<li><span class="aspects-list__pair">No aspects within tight orbs at this hour.</span></li>';
      return;
    }
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    ul.innerHTML = aspects.map(a => `
      <li>
        <span class="aspects-list__pair"><b>${cap(a.transit)}${a.retro ? ' ℞' : ''}</b> <span class="mono">→</span> Natal <b>${cap(a.natal)}</b></span>
        <span class="aspects-list__type" style="--c:${a.aspect.tone}">${a.aspect.name} ${a.aspect.angle}°</span>
        <span class="aspects-list__exact mono">orb ${a.exactness.toFixed(1)}°</span>
      </li>
    `).join('');
  }


  /* ---------- chart summary on profile ---------- */
  function renderChartSummary() {
    const note = document.getElementById('profileNote');
    const chart = getNatalChart();
    if (!note) return;
    if (!chart) {
      note.textContent = 'FILL THE FORM · GET YOUR SOUL REPORT';
      note.style.color = '';
      return;
    }
    const sun = lonToSign(chart.sun.lon).str;
    const moon = lonToSign(chart.moon.lon).str;
    const asc = lonToSign(chart.ascendant).str;
    const tz = chart.city.tz != null ? chart.city.tz : Math.round(chart.city.lon / 15);
    const tzLabel = `UTC${tz >= 0 ? '+' : ''}${tz}`;
    const cityShort = (chart.city.name || '').split(',')[0].toUpperCase();
    note.innerHTML = `<span style="color:var(--cyan)">CHART CAST</span> · ☉ ${sun} · ☾ ${moon} · ASC ${asc} · ${cityShort} · ${tzLabel}`;
  }


  /* ---------- orchestrator ---------- */
  function refreshAll() {
    refreshSky();
    recomputePlanetsForMap();
    if (mapEl) renderMap();
    renderTransitList();
    renderChartSummary();
  }
  // initial refresh once profile is loaded
  setTimeout(refreshAll, 0);


  /* ---------- transit reading rotator ---------- */
  const READINGS = [
    [
      "Mars trine your natal Sun gives the week its accelerant — a window where ambition and identity move together rather than at odds. Begin what you have been hesitating over; the sky is unusually willing.",
      "Saturn square the Moon is the week's friction. An emotional structure you have been deferring asks to be looked at. Not a punishment — an audit. Sit with the discomfort long enough to name what the structure was protecting.",
      "Mercury retrograde opposite Saturn invites a slow, careful conversation rather than a fast one. Send the long email. Re-read the contract. The sky rewards revision this week, not announcement."
    ],
    [
      "Venus conjunct your natal Mercury softens the registers in which you speak. What was a memo becomes a letter. The sentence you draft today will read better than the sentence you draft tomorrow.",
      "Jupiter sextile Venus widens an aperture that has been narrow for months. A door you wrote off opens, slightly, by surprise. Walk through it before you over-think the threshold.",
      "Mars in the eleventh house wants a friendship to sharpen into a project. Choose one ally and one promise. Cosmic momentum is allergic to the diffuse this week."
    ],
    [
      "The Moon waxing across your seventh house is a tidal asking — partnership, witness, the other. Whatever is unsaid will press on the surface; let the asking happen rather than answering before it arrives.",
      "Saturn retrograde opposite the Sun is a structural review, not a structural failure. The thing you built two years ago is not wrong; it is asking to be re-mortared.",
      "Neptune squaring Mercury is the week's haze. Trust no first reading of any document. Sleep on every commitment. The fog will clear by Sunday — what you decide before it lifts is not yours."
    ]
  ];

  let readingIdx = 0;
  const regenBtn = document.querySelector('.btn--regen');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      readingIdx = (readingIdx + 1) % READINGS.length;
      const target = document.querySelectorAll('.reading p');
      const next = READINGS[readingIdx];
      target.forEach((p, i) => {
        p.style.opacity = '0';
        setTimeout(() => {
          p.textContent = next[i];
          p.style.transition = 'opacity 0.6s';
          p.style.opacity = '1';
        }, 200 + i * 120);
      });
    });
  }


  /* ---------- meditation orb ---------- */
  const orb = document.getElementById('orb');
  const orbStart = document.getElementById('orbStart');
  const breathLabel = document.getElementById('breathLabel');
  const themeList = document.getElementById('themeList');

  // Six themed meditation scripts (6 paragraphs each, ~30 words per).
  // Spoken via Web Speech API at ~0.85x rate with 2.4 s pauses between beats.
  const MEDITATION_SCRIPTS = {
    lunar: [
      'Settle in. Let the body land where it sits. Notice the weight of you arriving back into the room.',
      'Tonight we work with the lunar tide. The moon does not push the ocean; it permits the ocean to remember which way is home.',
      'Breathe in, and let something rise that you have been holding low. Breathe out, and let it go down again, softer than it came up.',
      'You do not have to fix the feeling. You only have to feel it the way the tide feels the moon: without arguing.',
      'The moon will turn whether or not you keep watch. You are allowed to rest. The watching is being done for you.',
      'When you are ready, return. Carry the softness with you. The tide will be where you left it.',
    ],
    solar: [
      'Settle in. Sit as if your spine were a stem and your head a flower turning toward light.',
      'Today we work with the solar flame. The sun does not try to be the sun; it simply burns, and the world is illuminated as a side effect.',
      'Breathe in heat. Breathe out the part of you that has been performing instead of shining.',
      'There is a difference between being seen and being witnessed. The sun is witnessed without being watched. You are allowed to be the same.',
      'What you have to give does not run out by being given. It is more like fire than like money.',
      'When you are ready, return. Take the warmth with you. It belongs to the room now.',
    ],
    venus: [
      'Settle in. Let your hands rest open. Let your jaw soften. Let the front of you uncoil.',
      'We work with the venusian bloom. Venus does not chase. Venus arrives slowly, beautifully, and stays exactly as long as she chooses.',
      'Breathe in pleasure. Not earned pleasure, not deserved pleasure. Just the pleasure of breath itself.',
      'You do not have to be useful to be loved. You do not have to perform value to deserve being met.',
      'The body is not a problem to solve. The body is the place love is happening, right now, without your permission.',
      'When you are ready, return. Stay soft. The softness is not weakness; it is the strongest material the body knows.',
    ],
    saturn: [
      'Settle in. Sit heavy. Let the chair carry you. Let gravity do the work it was made to do.',
      'We work with the saturnian stone. Saturn is the gift of slowness. Saturn says: you have time, you have always had time, you will continue to have time.',
      'Breathe in patience. Breathe out the urgency that was given to you by someone who could not stand still.',
      'The thing you are building is not behind schedule. The schedule was someone else’s. You are exactly where the building wants you to be.',
      'Discipline is not punishment. Discipline is the love of a future self for the present one.',
      'When you are ready, return. Move slower than you were moving before. Keep the weight.',
    ],
    cosmic: [
      'Settle in. Feel the ground beneath you. Feel the room around you. Feel the planet under the room.',
      'We work with cosmic alignment. The body is small, the room is medium, the planet is large, and the field that holds all of it is larger again.',
      'Breathe in the size of you. Breathe out into the size of the room. Breathe in the size of the room. Breathe out into the size of the sky.',
      'You are not separate from any of it. You never were. The boundary of the skin is a courtesy, not a fact.',
      'There is no place you have to get to. The alignment is what you are made of, when you are not arguing with it.',
      'When you are ready, return. Notice the room. Notice the body. Notice the sky inside the body.',
    ],
    today: [
      'Settle in. Let the day land. You have done what you have done; you have left undone what you have left undone.',
      'We work with the sky as it is, this hour. There is weather above us, and weather inside us. We will not pretend they are unrelated.',
      'Breathe in whatever the day asked of you. Breathe out whatever the day took.',
      'Some of what you are carrying is not yours. Some of it is. You do not have to know which is which to put some of it down.',
      'Tomorrow is allowed to be different. You are allowed to be different. Permission was always available.',
      'When you are ready, return. The day continues. You continue with it, but lighter.',
    ],
  };

  let selectedTheme = 'lunar';
  if (themeList) {
    themeList.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-theme]');
      if (!li) return;
      themeList.querySelectorAll('li').forEach(x => x.classList.remove('is-on'));
      li.classList.add('is-on');
      selectedTheme = li.dataset.theme;
    });
  }

  // Pick a calm female English voice if available.
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferred = ['Samantha', 'Karen', 'Moira', 'Serena', 'Fiona', 'Tessa', 'Allison'];
    for (const name of preferred) {
      const v = voices.find(x => x.name === name);
      if (v) return v;
    }
    return voices.find(v => /^en[-_]/i.test(v.lang)) || voices[0];
  }
  if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {});
  }

  let breathing = false;
  let breathTimer = null;
  let speechActive = false;

  function stopBreathing() {
    breathing = false;
    if (orb) orb.classList.remove('is-breathing');
    clearTimeout(breathTimer);
    if (breathLabel) {
      breathLabel.textContent = 'PRESS BEGIN';
      breathLabel.style.color = '';
    }
    if (orbStart) orbStart.textContent = 'Begin meditation';
    if (speechActive && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechActive = false;
  }

  function startBreathing() {
    breathing = true;
    if (orb) orb.classList.add('is-breathing');
    if (orbStart) orbStart.textContent = 'Pause meditation';

    // breath label cycle
    let phase = 0;
    const phases = ['INHALE', 'HOLD', 'EXHALE', 'REST'];
    const timings = [3500, 1000, 3500, 1000];
    const cycle = () => {
      if (!breathing) return;
      if (breathLabel) {
        breathLabel.textContent = phases[phase];
        breathLabel.style.color = phase === 0 ? '#ffb37a'
                                  : phase === 2 ? '#4dd6c8'
                                  : '#8a8676';
      }
      breathTimer = setTimeout(() => {
        phase = (phase + 1) % phases.length;
        cycle();
      }, timings[phase]);
    };
    cycle();

    // speak meditation
    if ('speechSynthesis' in window) {
      const script = MEDITATION_SCRIPTS[selectedTheme] || MEDITATION_SCRIPTS.lunar;
      const voice = pickVoice();
      speechActive = true;
      let i = 0;
      const speakNext = () => {
        if (!breathing || !speechActive || i >= script.length) {
          if (i >= script.length && breathing) {
            // gracefully end
            stopBreathing();
            if (breathLabel) breathLabel.textContent = 'COMPLETE';
          }
          return;
        }
        const u = new SpeechSynthesisUtterance(script[i]);
        if (voice) u.voice = voice;
        u.rate  = 0.86;
        u.pitch = 0.95;
        u.volume = 0.85;
        u.onend = () => {
          if (!breathing) return;
          i++;
          setTimeout(speakNext, 2400);
        };
        u.onerror = () => { speechActive = false; };
        window.speechSynthesis.speak(u);
      };
      // start after a beat so first INHALE shows
      setTimeout(speakNext, 1800);
    }
  }

  if (orbStart) {
    orbStart.addEventListener('click', () => {
      if (breathing) stopBreathing();
      else            startBreathing();
    });
  }


  /* ---------- molybdomancy lead blob ---------- */
  const blob = document.getElementById('leadBlob');
  const blobCtx = blob && blob.getContext('2d');
  const archetypeList = document.getElementById('archetypeList');
  const leadStop = document.getElementById('leadStop');
  const leadReset = document.getElementById('leadReset');

  // archetype shape parameters: lobes / elong / twist
  const ARCHETYPES = [
    { name: 'BIRD',       lobes: 3, elong: 1.4, twist: 0.4 },
    { name: 'HAND',       lobes: 5, elong: 1.6, twist: 0.2 },
    { name: 'SERPENT',    lobes: 2, elong: 2.0, twist: 0.7 },
    { name: 'HEART',      lobes: 2, elong: 1.0, twist: 0.0 },
    { name: 'SHIP',       lobes: 1, elong: 1.8, twist: 0.1 },
    { name: 'TREE',       lobes: 4, elong: 1.7, twist: 0.3 },
    { name: 'MOON',       lobes: 1, elong: 1.0, twist: 0.0 },
    { name: 'WOLF',       lobes: 3, elong: 1.5, twist: 0.5 },
    { name: 'CROSS',      lobes: 4, elong: 1.2, twist: 0.0 },
    { name: 'MOUNTAINS',  lobes: 5, elong: 1.0, twist: 0.1 },
  ];

  let archIdx = 0;
  let blobT = 0;
  let frozen = false;
  let cracks = [];
  let trembleAmp = 0;
  let blobReq = 0;
  let blobDpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeBlob() {
    if (!blob) return;
    const rect = blob.getBoundingClientRect();
    blob.width  = rect.width  * blobDpr;
    blob.height = rect.height * blobDpr;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }

  function blendArchetype(a, b, t) {
    return {
      lobes: Math.round(lerp(a.lobes, b.lobes, t)),
      elong: lerp(a.elong, b.elong, t),
      twist: lerp(a.twist, b.twist, t),
    };
  }

  function drawBlob(time) {
    if (!blobCtx) return;
    const W = blob.width, H = blob.height;
    blobCtx.clearRect(0, 0, W, H);

    // animated archetype: cycle through every 7s
    const periodMs = 7000;
    blobT = time;
    const phaseRaw = (time % (periodMs * ARCHETYPES.length)) / periodMs;
    const i = Math.floor(phaseRaw);
    const local = easeInOut(phaseRaw - i);
    const cur = ARCHETYPES[i % ARCHETYPES.length];
    const next = ARCHETYPES[(i + 1) % ARCHETYPES.length];
    archIdx = i % ARCHETYPES.length;
    const shape = blendArchetype(cur, next, local);

    // sync pill list highlight
    if (archetypeList) {
      const lis = archetypeList.children;
      for (let k = 0; k < lis.length; k++) {
        lis[k].classList.toggle('is-on', k === archIdx);
      }
    }

    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.30;

    // tremble jitter on freeze
    let jx = 0, jy = 0;
    if (frozen && trembleAmp > 0) {
      jx = (Math.random() - 0.5) * trembleAmp;
      jy = (Math.random() - 0.5) * trembleAmp;
      trembleAmp *= 0.94;
    }

    const N = 200;
    const points = [];
    for (let k = 0; k < N; k++) {
      const ang = (k / N) * Math.PI * 2;
      const wave = 1 + 0.18 * Math.sin(shape.lobes * ang + time * 0.0006 + shape.twist * Math.PI * 2);
      const r = baseR * wave;
      const x = cx + jx + Math.cos(ang) * r;
      const y = cy + jy + Math.sin(ang) * r * (1 / shape.elong);
      points.push([x, y]);
    }

    // metallic radial gradient
    const grd = blobCtx.createRadialGradient(cx - baseR * 0.4, cy - baseR * 0.5, baseR * 0.15, cx, cy, baseR * 1.4);
    if (frozen) {
      // cooled lead
      grd.addColorStop(0,   '#a8a39a');
      grd.addColorStop(0.5, '#5e5b53');
      grd.addColorStop(1,   '#1a1a1a');
    } else {
      // molten
      grd.addColorStop(0,   '#fff2c0');
      grd.addColorStop(0.18,'#ffb37a');
      grd.addColorStop(0.5, '#8a3a18');
      grd.addColorStop(1,   '#1a0e08');
    }

    blobCtx.beginPath();
    points.forEach(([x, y], k) => k === 0 ? blobCtx.moveTo(x, y) : blobCtx.lineTo(x, y));
    blobCtx.closePath();
    blobCtx.fillStyle = grd;
    blobCtx.fill();

    // specular highlight
    blobCtx.save();
    blobCtx.globalCompositeOperation = 'lighter';
    const spec = blobCtx.createRadialGradient(cx - baseR * 0.45, cy - baseR * 0.5, 1, cx - baseR * 0.45, cy - baseR * 0.5, baseR * 0.55);
    spec.addColorStop(0, 'rgba(255, 245, 220, 0.55)');
    spec.addColorStop(1, 'rgba(255, 245, 220, 0)');
    blobCtx.fillStyle = spec;
    blobCtx.beginPath();
    blobCtx.arc(cx - baseR * 0.45, cy - baseR * 0.5, baseR * 0.55, 0, Math.PI * 2);
    blobCtx.fill();
    blobCtx.restore();

    // outer glow when molten
    if (!frozen) {
      blobCtx.save();
      blobCtx.globalCompositeOperation = 'screen';
      const halo = blobCtx.createRadialGradient(cx, cy, baseR, cx, cy, baseR * 1.8);
      halo.addColorStop(0, 'rgba(255, 140, 66, 0.45)');
      halo.addColorStop(1, 'rgba(255, 140, 66, 0)');
      blobCtx.fillStyle = halo;
      blobCtx.fillRect(0, 0, W, H);
      blobCtx.restore();
    }

    // cracks
    if (frozen && cracks.length) {
      blobCtx.save();
      blobCtx.strokeStyle = 'rgba(15, 12, 10, 0.85)';
      blobCtx.lineWidth = 1.4 * blobDpr;
      blobCtx.lineCap = 'round';
      cracks.forEach(c => {
        const reveal = Math.min(1, (time - c.start) / 1600);
        if (reveal <= 0) return;
        blobCtx.beginPath();
        const segs = Math.floor(c.path.length * reveal);
        for (let k = 0; k < segs; k++) {
          const [x, y] = c.path[k];
          if (k === 0) blobCtx.moveTo(x, y);
          else blobCtx.lineTo(x, y);
        }
        blobCtx.stroke();

        c.branches.forEach(br => {
          if (br.start > time) return;
          const brReveal = Math.min(1, (time - br.start) / 800);
          blobCtx.beginPath();
          const bSegs = Math.floor(br.path.length * brReveal);
          for (let k = 0; k < bSegs; k++) {
            const [x, y] = br.path[k];
            if (k === 0) blobCtx.moveTo(x, y);
            else blobCtx.lineTo(x, y);
          }
          blobCtx.stroke();
        });
      });
      blobCtx.restore();
    }

    blobReq = requestAnimationFrame(drawBlob);
  }

  function makeCracks(time) {
    const W = blob.width, H = blob.height;
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.30;
    const count = 6 + Math.floor(Math.random() * 5);
    cracks = [];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const segs = 5 + Math.floor(Math.random() * 3);
      const path = [[cx, cy]];
      let r = 0;
      let a = ang;
      for (let s = 0; s < segs; s++) {
        r += baseR / segs * (0.7 + Math.random() * 0.6);
        a += (Math.random() - 0.5) * 0.5;
        path.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const branches = [];
      const brCount = Math.random() < 0.6 ? 1 : 2;
      for (let b = 0; b < brCount; b++) {
        const branchAt = 1 + Math.floor(Math.random() * (segs - 1));
        const [bx, by] = path[branchAt];
        const bAng = a + (Math.random() - 0.5) * 1.2;
        const bSegs = 2 + Math.floor(Math.random() * 3);
        const bp = [[bx, by]];
        let bR = 0, bA = bAng;
        for (let s = 0; s < bSegs; s++) {
          bR += baseR / 8 * (0.7 + Math.random() * 0.6);
          bA += (Math.random() - 0.5) * 0.4;
          bp.push([bx + Math.cos(bA) * bR, by + Math.sin(bA) * bR]);
        }
        branches.push({ path: bp, start: time + 600 + Math.random() * 600 });
      }
      cracks.push({ path, branches, start: time + i * 80 });
    }
  }

  if (leadStop) {
    leadStop.addEventListener('click', () => {
      if (frozen) return;
      // tremble first, then crack
      trembleAmp = 14 * blobDpr;
      setTimeout(() => {
        frozen = true;
        makeCracks(blobT + 550);
      }, 550);
      leadStop.disabled = true;
      leadStop.textContent = 'Lead has cooled';
    });
  }

  if (leadReset) {
    leadReset.addEventListener('click', () => {
      frozen = false;
      cracks = [];
      trembleAmp = 0;
      if (leadStop) {
        leadStop.disabled = false;
        leadStop.textContent = 'Stop the lead';
      }
    });
  }


  /* ---------- molybdomancy ritual flow + reading ---------- */

  const LEAD_READINGS = {
    BIRD: {
      form:    'A bird shape — a reach upward, wings half-set.',
      mood:    'A lift just before separation. A wing-set unsure if it will rise.',
      motion:  'The lead moved before it settled. Hesitation, then ascent.',
      meaning: 'News is travelling toward you. Not big. True.',
      counsel: 'Watch what flies across your morning the next three days. Note who returns from a distance.',
    },
    HAND: {
      form:    'A hand — five lobes, open palm.',
      mood:    'Capable, holding, a little tired.',
      motion:  'Open, close, open again. The hand cannot decide whether to give or to keep.',
      meaning: 'Something is being given to you, or asked of you, that requires you to be open without grasping.',
      counsel: 'Say yes to one favour and no to one obligation this week. Notice which felt heavier.',
    },
    SERPENT: {
      form:    'A serpent — elongated, coiling, a thin line.',
      mood:    'Patient, watchful, deep. Intensity that does not announce itself.',
      motion:  'Coiled, then long, then coiled again. Movement that returns to its own beginning.',
      meaning: 'A truth you have been circling is closer than you think. An old skin is ready to be shed.',
      counsel: 'Stop performing the version of yourself you outgrew two years ago.',
    },
    HEART: {
      form:    'A heart — two lobes, soft centre.',
      mood:    'Tender, present, slightly bruised.',
      motion:  'A beating that has had to slow down to keep itself company.',
      meaning: 'A love you had marked closed has weather around it. The chapter is not as finished as you reported.',
      counsel: 'Reach toward one person you have not allowed yourself to miss.',
    },
    SHIP: {
      form:    'A ship — long hull, tilted toward a horizon.',
      mood:    'Outbound. A leaving that wants to be a choosing.',
      motion:  'Tipped slightly, riding wave-set, holding course.',
      meaning: 'A long journey is being set up while you sleep. A part of you has decided without consulting the rest.',
      counsel: 'Pack what travels well. Leave the rest. Trust the part that already left.',
    },
    TREE: {
      form:    'A tree — branching upward, rooted below.',
      mood:    'Rooted, slow-growing, holding more weight than it looks.',
      motion:  'Almost none. Internal. Growth too gradual to see in a single season.',
      meaning: 'What you are building requires a season you have not yet been through.',
      counsel: 'Stop measuring it monthly. Plant the next thing. Both will grow.',
    },
    MOON: {
      form:    'A moon — round, single, contained.',
      mood:    'Reflective, cyclical, in-between. Neither full nor new.',
      motion:  'A turning, a turning, a turning.',
      meaning: 'An inner cycle is mid-arc. Not nothing, not yet visible.',
      counsel: 'Stay private with what is changing in you. Tell two people, not ten.',
    },
    WOLF: {
      form:    'A wolf — three lobes, lean and watchful.',
      mood:    'Loyal, hungry, observant.',
      motion:  'A long lope across the edge of a clearing.',
      meaning: 'Your people are nearer than you have allowed. So is your appetite, which you have been politely starving.',
      counsel: 'Eat with someone this week. Not for politeness. For pack.',
    },
    CROSS: {
      form:    'A cross — two lines meeting at a centre.',
      mood:    'Decisive, intersected, no longer two paths.',
      motion:  'A meeting at the centre. Stillness after.',
      meaning: 'Two threads of your life are about to cross. The crossing is the point, not the separation that follows.',
      counsel: 'Be present at the intersection. Do not skip ahead to the consequence.',
    },
    MOUNTAINS: {
      form:    'Mountains — a ridge of peaks, weight low.',
      mood:    'Old, weathered, indifferent to the timetable.',
      motion:  'None visible. Geology, not behaviour.',
      meaning: 'A challenge in your life is larger than the year it sits in. Treat it accordingly.',
      counsel: 'Stop asking the mountain to be smaller. Get equipment.',
    },
  };

  const molybCard    = document.getElementById('molybCard');
  const leadRitual   = document.getElementById('leadRitual');
  const leadPour     = document.getElementById('leadPour');
  const leadReading  = document.getElementById('leadReading');

  function setRitualStep(n) {
    if (!leadRitual) return;
    leadRitual.querySelectorAll('.lead-ritual__panel').forEach(p => {
      p.hidden = parseInt(p.dataset.step, 10) !== n;
    });
    leadRitual.querySelectorAll('.lead-ritual__steps span').forEach(s => {
      s.classList.toggle('is-on', parseInt(s.dataset.r, 10) <= n);
    });
  }

  function runRitualBreathing(onDone) {
    const orbEl = leadRitual && leadRitual.querySelector('.lead-ritual__breath-orb');
    const label = document.getElementById('leadBreathLabel');
    if (!orbEl || !label) { onDone && onDone(); return; }
    let breath = 0;
    let inhaling = true;
    const cycle = () => {
      label.textContent = inhaling ? 'INHALE' : 'EXHALE';
      orbEl.classList.toggle('is-in', inhaling);
      setTimeout(() => {
        inhaling = !inhaling;
        if (!inhaling) breath++;
        if (breath >= 3 && inhaling) {
          onDone && onDone();
        } else {
          cycle();
        }
      }, 3600);
    };
    cycle();
  }

  function showReading() {
    if (!leadReading) return;
    const arch = ARCHETYPES[archIdx] || ARCHETYPES[0];
    const data = LEAD_READINGS[arch.name];
    if (!data) return;
    leadReading.querySelector('[data-r="form"]').textContent    = data.form;
    leadReading.querySelector('[data-r="mood"]').textContent    = data.mood;
    leadReading.querySelector('[data-r="motion"]').textContent  = data.motion;
    leadReading.querySelector('[data-r="meaning"]').textContent = data.meaning;
    leadReading.querySelector('[data-r="counsel"]').textContent = data.counsel;
    leadReading.hidden = false;
    if (molybCard) molybCard.dataset.stage = 'reading';
  }

  // wire ritual buttons
  if (leadRitual) {
    const nextBtn = leadRitual.querySelector('[data-action="ritual-next"]');
    const pourBtn = leadRitual.querySelector('[data-action="ritual-pour"]');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        setRitualStep(2);
        runRitualBreathing(() => setRitualStep(3));
      });
    }

    if (pourBtn) {
      pourBtn.addEventListener('click', () => {
        leadRitual.hidden = true;
        if (leadPour) leadPour.hidden = false;
        if (molybCard) molybCard.dataset.stage = 'pouring';
        // resize the canvas now that it has dimensions
        setTimeout(() => {
          if (typeof resizeBlob === 'function') resizeBlob();
        }, 50);
      });
    }
  }

  // when the lead has cooled, surface the reading after the crack animation
  if (leadStop) {
    leadStop.addEventListener('click', () => {
      setTimeout(showReading, 3200);
    });
  }

  // new ritual
  if (leadReading) {
    const restart = leadReading.querySelector('[data-action="ritual-restart"]');
    if (restart) {
      restart.addEventListener('click', () => {
        leadReading.hidden = true;
        if (leadPour)   leadPour.hidden   = true;
        if (leadRitual) leadRitual.hidden = false;
        setRitualStep(1);
        frozen = false;
        cracks = [];
        trembleAmp = 0;
        if (leadStop) { leadStop.disabled = false; leadStop.textContent = 'Stop the lead'; }
        const q = document.getElementById('leadQuestion');
        const c = document.getElementById('leadConfession');
        if (q) q.value = '';
        if (c) c.value = '';
        if (molybCard) molybCard.dataset.stage = 'ritual';
      });
    }
  }

  if (blob) {
    resizeBlob();
    window.addEventListener('resize', resizeBlob);
    blobReq = requestAnimationFrame(drawBlob);
  }

  // cleanup if module ever torn down
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(blobReq);
  });


  /* ---------- oracle drawer + streamed readings ---------- */

  const ORACLES = {
    natal: {
      tone: 'amber', glyph: '☉',
      eyebrow: 'N · 01 · MODERN WESTERN · TROPICAL',
      title: 'Natal Chart',
      variants: [
        [
          "Sun in Aries on the cusp of the first house gives you a chart that begins with declaration. The self is the question and the answer; you do not arrive at identity by inference but by impact. The risk is that velocity becomes a substitute for direction — you will know you have grown when the same fire stops needing to win the argument.",
          "Moon in Cancer near the IC suggests an emotional life rooted below the visible floor of the house. You feel privately, intensely, in the colors no one taught you to name. This is your secret architecture; protect it from people who treat softness as data.",
          "Rising sign in Gemini tilts the public face toward language and curiosity. Strangers will take you for someone who is light. The chart says otherwise — but the disguise is useful, and the chart, generously, lets you keep it.",
          "Mars exalted in Capricorn in the tenth house: a long, slow professional spine. Ambition that moves like a glacier. You will accomplish more than people who are louder than you, and you will do it by treating the next ten years as one project rather than thirty."
        ],
        [
          "An Aries Sun set against a Cancer Moon is the chart's first contradiction — fire that wants to break, water that wants to hold. Most of your life will be spent translating between these two languages. The translation itself is the gift; do not seek to resolve it.",
          "Mercury in Pisces is a thinker who arrives at the right answer by the wrong route. You will be told you are unfocused. You are not. You are simply solving a different problem than the one in front of you, and the chart insists you keep doing this.",
          "Venus in Taurus near the second house: love arrives slowly, materially, in the form of patience and well-built things. You will mistrust quick affection. Trust the mistrust — it has saved you before.",
          "Saturn opposite the Sun is the lifelong difficulty: a slow earning of the authority you already have. Each decade peels away another false father. By forty you will look up and notice the room is yours."
        ]
      ]
    },

    daily: {
      tone: 'cyan', glyph: '☀',
      eyebrow: 'N · 02 · DAILY GUIDE',
      title: 'Daily Guide',
      variants: [
        [
          "The Moon in Libra all morning will ask you to balance two kinds of attention you do not normally hold at the same time. Take the meeting that is not on your calendar. The week's most useful information is in a corridor conversation.",
          "Venus tightens her conjunction with Mercury this afternoon — a small window for words to land where they have been bouncing. The email you have been drafting since Sunday will write itself in eleven minutes. Send it before you re-read it.",
          "Tonight the sky narrows. Mars sextiles Saturn after midnight, which is the kind of aspect that rewards a small private decision rather than a public one. Decide one thing in writing, alone, and let the next forty-eight hours measure it."
        ],
        [
          "A Cancer Moon early in the day softens the room. You will overhear something that is not meant for you; treat it as weather, not signal. The temptation to forward it will pass.",
          "Mercury squares Jupiter at 14:22 — too many words, too few of them right. Defer the long message. The more carefully you say nothing, the more accurately you will be understood.",
          "By evening the Moon enters Leo. A small celebratory act — a candle, a record, a meal eaten more slowly than you usually eat — pays the day what it is owed."
        ]
      ]
    },

    synastry: {
      tone: 'rose', glyph: '⚭',
      eyebrow: 'N · 03 · SYNASTRY',
      title: 'Synastry Weaver',
      structured: true,
      variants: [
        {
          chemistry: "Their Mars sits within two degrees of your Venus. This is the placement classical astrologers wrote love letters about. The attraction will not need explanation; the question is whether you will mistake legibility for compatibility.",
          communication: "Mercury in your charts is in mutual reception — your Mercury in their sign, theirs in yours. You will talk easily across most subjects and dangerously across the few you cannot share. Notice which silences feel like agreement and which feel like avoidance.",
          bond: "The Moon-to-Moon contact is a wide trine. Emotional weather will be similar but not synchronized. You will both feel the same storm, at slightly different hours. This is a long-form gift, not a short-term one.",
          friction: "Saturn squares the composite Sun. Real life will press on this relationship from outside — work, family, geography. The friction is not interpersonal; it is structural. Treat it accordingly: solve it as logistics, not as a feeling.",
          score: "8.4 / 10",
          verdict: "An unusually well-matched chart. The weather inside is the weather you can shape; the weather outside will need a roof."
        },
        {
          chemistry: "Your Mars and theirs are separated by an exact square. The pull is real and the pull is sharp; nothing about this connection will be quiet. Choose to enjoy it.",
          communication: "Their Mercury falls in your fourth house. They will speak to a part of you most people cannot find. Keep watch over what you say back — it will lodge deeper than you intend.",
          bond: "The Moons are inconjunct. You will love each other in incompatible idioms and have to translate. Translation is, again, the work — and it improves both of you.",
          friction: "Venus retrograde in the synastry chart asks for a returning, a re-meeting. Whoever you were when you first met is not who is meeting now. Let the relationship update itself.",
          score: "7.2 / 10",
          verdict: "High voltage, real grain. The work is in the calibration."
        }
      ]
    },

    hellenistic: {
      tone: 'amber', glyph: 'Ω',
      eyebrow: 'A · 01 · HELLENISTIC · 200 BCE – 400 CE',
      title: 'Hellenistic Oracle',
      variants: [
        [
          "Yours is a diurnal chart. The Sun rules the sect — the daily luminary — and so the chart is judged by what the Sun does, where it falls, whom it speaks with. Vettius Valens would have written your nativity in a clear hand: the Sun in its own bound, in the ascending hemisphere, near the angle of the East. A native born to be seen.",
          "The Lot of Fortune falls in the eleventh place, the place of the Good Daimon. Friends and benefactors will furnish your life with material support more reliably than your own labor will. Ptolemy reads this as the inheritance of company. Do not refuse what arrives by the agency of others.",
          "Annual profections this year activate the third place — siblings, short journeys, doctrine. The time-lord is Mars, in its own domicile, well-aspected by Jupiter. This is a year of sharp learning conducted at speed. Take the trip that has been postponed; write the thing you have been afraid to write down.",
          "Dorotheus of Sidon counsels caution with the eighth place when the year-lord is a malefic, but here the malefic is not afflicted, and the eighth governs not death but transformation by inheritance. A small windfall is plausible. Do not announce it; let it settle three months before you spend it."
        ],
        [
          "A nocturnal chart, judged by the Moon. The night births differently than the day: the chart is read inward first, outward second. The Moon is the queen of this nativity, and her condition determines the season of the soul.",
          "Saturn benefic by sect — a contradiction the moderns fail to record. In your chart the great malefic, by virtue of being the diurnal benefic of the night sect... no: of the night chart, the diurnal benefic is the sect light's friend. The greater benefic for you is Venus; the greater malefic, Mars. Take this seriously when reading any year.",
          "The Lot of Spirit falls into the seventh place. Public partnerships — work, marriage, debate — are the theatre in which you become yourself. You are not a private person dressed up for the public; you are someone the public completes.",
          "The current profected year falls to the seventh as well, doubling the emphasis. Whatever you begin in partnership this year will mark a decade. Choose the partner with care; the chart is uninterested in second drafts."
        ]
      ]
    },

    cartography: {
      tone: 'cyan', glyph: '⊕',
      eyebrow: 'M · 01 · ASTROCARTOGRAPHY',
      title: 'Astrocartography',
      tool: true,
      action: { label: 'Open the live map', target: '#cartography' },
      paragraphs: [
        "The chart you were born with is one chart. The chart of where you live is another. Astrocartography draws every planet's meridian and horizon as a line on the surface of the Earth — the geography along which each archetype expresses most directly.",
        "Solid lines are MC and AC: career and identity, the meridian and the rising horizon. Dashed lines are IC and DC: home and partnership, the descent and the foundation. Where two lines cross, an archetype intensifies; where a planet passes through a place you already know, it explains the place to you.",
        "The live map redraws as you toggle planets. Try Venus and Jupiter for ease, Mars for sharpening, Saturn for slow building, Sun for visibility. The lines do not tell you where to go — they tell you what each place will ask of you when you arrive."
      ]
    },

    transit: {
      tone: 'amber', glyph: '☄',
      eyebrow: 'T · 01 · TRANSIT TRACKER',
      title: 'Transit Tracker',
      tool: true,
      action: { label: 'Open the live tracker', target: '#transit' },
      paragraphs: [
        "Transits are the moving sky against the chart you were born with. Every day, every planet stands at some angle to a planet in your nativity — and from those angles a kind of weather emerges.",
        "The tracker resolves five canonical aspects (conjunction, sextile, square, trine, opposition) within calibrated orbs, and flags retrograde motion as it occurs. Hard aspects (square, opposition) push; soft aspects (sextile, trine) open. Conjunctions amplify whatever they touch.",
        "Read transits as pressure, not prediction. The sky does not decide for you. It asks louder questions on certain days, and the work is to recognize which question the day is putting."
      ]
    },

    atlas: {
      tone: 'cyan', glyph: '⊙',
      eyebrow: 'M · 02 · ATLAS ORACLE',
      title: 'Atlas Oracle',
      regional: true,
      regions: {
        europe: [
          "Your Sun line passes through Lisbon, casting visibility and a slow public confidence over the Iberian coast. Lisbon would push you toward being seen on your own terms — a city that rewards patience and weather.",
          "Venus skims the south of France along the same belt. Marseille and Nice are within an orb of softness; love and sense-pleasure are unusually accessible there. This is not a relocation for ambition. It is a relocation for nourishment.",
          "Jupiter's MC line crosses Berlin near vertical. The city would expand the public version of your work. Expect to take on more than you came for, and to grow into it within eighteen months.",
          "If you must choose one: Lisbon for clarity, Marseille for softness, Berlin for scale. The chart is unusually generous with Europe; almost any choice would be an improvement on staying still."
        ],
        americas: [
          "Mercury's AC line clips the Northeast coast of North America. Boston and Montréal are within orb. Both cities sharpen language; Montréal additionally bilingualizes the mind in a way the chart finds clarifying.",
          "Venus on the IC runs through Mexico City. Domestic life — the part of life that happens behind the door — softens and becomes more aesthetically organized there. A surprisingly home-shaped relocation for a place often misread as kinetic.",
          "São Paulo sits on a Mars line, which most readers would warn against. The chart, however, places Mars in domicile. For you specifically, São Paulo would not be war; it would be motor. Useful for a season, not a decade.",
          "Recommend, in this order: Mexico City for life, Montréal for thought, São Paulo for an engine year."
        ],
        asia: [
          "The Moon line passes through Kyoto. This is unusual — most charts route the Moon through Tokyo or Hong Kong. Kyoto would bring you uncommonly close to your own emotional weather without overwhelming it.",
          "Saturn's IC crosses Singapore. A relocation toward structure, finance, a long-form project. Not warm, but extraordinarily reliable.",
          "Jupiter on the AC reaches Mumbai. The chart predicts public expansion through partnership — a city that would offer collaborators rather than positions.",
          "Of the three: Kyoto for the inward life, Singapore for the financial spine, Mumbai if the project requires people who are also believers."
        ],
        oceania: [
          "Sun MC line strikes Auckland. Public visibility on a small national stage — the kind where you can become legible in eighteen months. The chart approves of this.",
          "Venus DC threads through Melbourne. Partnership intensifies there; Melbourne tends to coalesce relationships that have been drifting.",
          "The chart is sparse in Oceania — only two strong lines, far apart. Treat the region as a precise instrument: not many options, but the options that exist are clean."
        ],
        africa: [
          "Mercury's MC passes through Cape Town. Communication-led work would acquire a southern hemisphere clarity there, and a different sense of season.",
          "The Sun line clips Nairobi at a low angle. Visibility, but on terms that ask you to translate yourself for an audience that will repay the effort.",
          "Few other strong lines cross the continent in this chart. Cape Town remains the most concentrated invitation."
        ]
      }
    },

    meditation: {
      tone: 'rose', glyph: '☾',
      eyebrow: 'R · 01 · VOICE MEDITATION',
      title: 'Voice Meditation',
      tool: true,
      action: { label: 'Open the ritual', target: '#ritual' },
      paragraphs: [
        "The breath orb keeps a nine-second cycle: inhale for three and a half, hold for one, exhale for three and a half, rest for one. The cycle was chosen to slow the heart toward the resonance frequency of the parasympathetic nervous system — about six breaths per minute.",
        "Six themes are available: Lunar Tide for the tides of feeling, Solar Flame for vitality, Venusian Bloom for self-affection, Saturnian Stone for stamina, Cosmic Alignment for orientation, Today's Sky for the weather of the present hour.",
        "The ritual section composes a six-paragraph spoken script and reads it through the device's voice while the orb pulses on rhythm. Begin from the in-page panel; the meditation runs whether you keep this page in focus or not."
      ]
    },

    molybdomancy: {
      tone: 'amber', glyph: '◐',
      eyebrow: 'R · 02 · MOLYBDOMANCY',
      title: 'Molybdomancy',
      tool: true,
      action: { label: 'Open the ritual', target: '#ritual' },
      paragraphs: [
        "Molybdomancy is divination by molten lead — a practice older than most religions and quieter than most divinations. A question is held in the mind, lead is heated until it runs, and then poured into cold water. The shape it freezes into is read.",
        "The ritual on this page proceeds in three steps: Question, Breathing, Confession. After the third step the screen takes over: a parametric blob morphs through ten archetypal forms — Bird, Hand, Serpent, Heart, Ship, Tree, Moon, Wolf, Cross, Mountains — until you decide it has shown you what you came to see.",
        "Press Stop. The lead trembles for half a second, cracks, and cools. The reading that follows is structured in five sections: form, mood, motion, meaning, and counsel. Lead does not lie. It only tells the truth that most needs to be heard."
      ]
    }
  };


  // System prompts for live API calls. Match the spec's oracle definitions.
  const SYSTEM_PROMPTS = {
    natal: `You are the Natal Chart Oracle of Tajnstvo — a working modern Western tropical astrologer. The native's chart data is provided. Return EXACTLY 4 paragraphs separated by blank lines. No preamble, no greeting, no questions. Cover: (1) Sun and Moon together, (2) Rising sign and outward presentation, (3) two or three further planetary placements, (4) life themes. Specific and grounded. No purple prose. ~500 words total.`,
    daily: `You are the Daily Celestial Guide. The native's chart and today's UTC date are provided. Return EXACTLY 3 short paragraphs separated by blank lines: (1) today's energy, (2) love & career, (3) closing piece of cosmic advice. Tone: warm, specific, present-tense. No preamble.`,
    hellenistic: `You are an oracle of Hellenistic astrology, channeling Ptolemy, Vettius Valens, and Dorotheus of Sidon. Use whole-sign houses, sect (diurnal/nocturnal), the Lots of Fortune and Spirit, annual profections. Cite ancient sources by name where appropriate. Return EXACTLY 4 dense scholarly paragraphs separated by blank lines. No preamble.`,
    atlas: `You are the Atlas Oracle. The native's astrocartography lines and a chosen region are provided. Return EXACTLY 4 paragraphs separated by blank lines, naming 2-3 specific cities with rationale grounded in the active lines. No preamble.`,
  };

  async function callOracleLive(oracleKey, extraContext = '') {
    const key = readApiKey();
    if (!key) return null;
    const sp = SYSTEM_PROMPTS[oracleKey];
    if (!sp) return null;

    const chart = getNatalChart();
    const summary = chart
      ? summarizeChart(chart)
      : 'No birth profile saved yet — produce an archetypal but generic reading.';

    const today = new Date().toISOString().slice(0, 10);
    const userInput = `${summary}\n\nToday (UTC): ${today}\n${extraContext}\n\nReturn the reading now.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: sp,
        messages: [{ role: 'user', content: userInput }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${text.slice(0, 160)}`);
    }
    const data = await res.json();
    const txt = (data.content || []).map(b => b.type === 'text' ? b.text : '').join('\n');
    const paras = txt.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    return paras.length ? paras : null;
  }


  // streamed text writer
  let activeStream = null;
  function streamParagraphs(container, paragraphs, speed = 2) {
    cancelStream();
    container.innerHTML = '';

    const elements = paragraphs.map(() => {
      const p = document.createElement('p');
      container.appendChild(p);
      return p;
    });

    const cursor = '<span class="cursor"></span>';
    let pIdx = 0;
    let cIdx = 0;

    const tick = () => {
      if (pIdx >= paragraphs.length) {
        elements.forEach(p => { p.innerHTML = p.innerHTML.replace(cursor, ''); });
        activeStream = null;
        return;
      }
      const txt = paragraphs[pIdx];
      cIdx = Math.min(cIdx + speed, txt.length);
      elements.forEach((p, i) => {
        if (i < pIdx)      p.innerHTML = paragraphs[i];
        else if (i === pIdx) p.innerHTML = txt.slice(0, cIdx) + cursor;
        else p.innerHTML = '';
      });
      // auto-scroll to keep cursor in view
      container.scrollTop = container.scrollHeight;

      if (cIdx >= txt.length) { pIdx++; cIdx = 0; }
      activeStream = setTimeout(tick, 18);
    };
    tick();
  }

  function cancelStream() {
    if (activeStream) { clearTimeout(activeStream); activeStream = null; }
  }

  function fastForward(container, paragraphs) {
    cancelStream();
    container.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
    container.scrollTop = container.scrollHeight;
  }


  /* ---------- synastry: real chart-vs-chart math ---------- */

  let synastryPartner = null;

  function computeSynastryAspects(chartA, chartB) {
    const planets = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
    const out = [];
    for (const a of planets) {
      for (const b of planets) {
        const A = chartA[a], B = chartB[b];
        if (!A || !B) continue;
        let diff = Math.abs(A.lon - B.lon);
        if (diff > 180) diff = 360 - diff;
        for (const def of ASPECTS_DEFS) {
          const off = Math.abs(diff - def.angle);
          if (off <= def.orb * 0.95) {
            out.push({ from: a, to: b, aspect: def, exact: off });
          }
        }
      }
    }
    return out.sort((x, y) => x.exact - y.exact);
  }

  function categorizeSynastry(aspects) {
    const isPair = (a, p1, p2) =>
      (a.from === p1 && a.to === p2) || (a.from === p2 && a.to === p1);
    const isAny = (a, set) => set.includes(a.from) && set.includes(a.to);
    const chemistry = aspects.filter(a =>
      isPair(a, 'sun', 'mars')   || isPair(a, 'venus', 'mars') ||
      isPair(a, 'sun', 'venus')  || isPair(a, 'mars', 'mars')  ||
      isPair(a, 'venus', 'venus')
    );
    const communication = aspects.filter(a =>
      isPair(a, 'mercury', 'mercury') || isPair(a, 'sun', 'mercury') ||
      isPair(a, 'moon', 'mercury')    || isPair(a, 'mercury', 'venus')
    );
    const bond = aspects.filter(a =>
      isPair(a, 'moon', 'moon') || isPair(a, 'sun', 'moon') ||
      isPair(a, 'moon', 'venus') || isPair(a, 'sun', 'sun')
    );
    const friction = aspects.filter(a =>
      (a.aspect.name === 'SQUARE' || a.aspect.name === 'OPP') &&
      isAny(a, ['sun','moon','mercury','venus','mars'])
    );
    return { chemistry, communication, bond, friction };
  }

  function synastryScore(aspects) {
    let s = 5;
    const personal = ['sun','moon','venus','mars'];
    for (const a of aspects) {
      const isPersonal = personal.includes(a.from) && personal.includes(a.to);
      const w = isPersonal ? 1.5 : 0.8;
      let v = 0;
      if (a.aspect.name === 'TRINE')   v = 0.55;
      if (a.aspect.name === 'SEXTILE') v = 0.32;
      if (a.aspect.name === 'CONJ')    v = 0.36;
      if (a.aspect.name === 'SQUARE')  v = -0.38;
      if (a.aspect.name === 'OPP')     v = -0.28;
      s += v * w;
    }
    return Math.max(1, Math.min(10, s));
  }

  function synastryVerdict(score) {
    if (score >= 8.5) return 'An unusually well-matched chart pair. The weather outside will still need a roof.';
    if (score >= 7)   return 'A workable chart with real chemistry and manageable friction.';
    if (score >= 5.5) return 'A chart with both pull and push; the work is the calibration.';
    if (score >= 4)   return 'Significant friction; growth-oriented if both partners are intentional.';
    return                'A challenging pair; the friction outweighs the natural ease.';
  }

  const ASPECT_VERB = { CONJ:'conjunct', SEXTILE:'sextiles', SQUARE:'squares', TRINE:'trines', OPP:'opposes' };

  function describeAspects(aspects, max = 4) {
    if (!aspects.length) return null;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return aspects.slice(0, max).map(a =>
      `Your ${cap(a.from)} ${ASPECT_VERB[a.aspect.name] || a.aspect.name.toLowerCase()} their ${cap(a.to)} (orb ${a.exact.toFixed(1)}°).`
    ).join(' ');
  }

  function buildPartnerChart(profile) {
    const utc = profileToUTC(profile);
    if (!utc || isNaN(utc.getTime())) return null;
    const c = computeChart(utc);
    c.profile = profile;
    c.city = { name: profile.cityName, lat: profile.lat, lon: profile.lon, tz: profile.tz };
    c.ascendant = computeAscendant(utc, profile.lat, profile.lon);
    c.mc        = computeMC(utc, profile.lon);
    return c;
  }

  function renderSynastryForm() {
    drawerStatus.textContent = 'ENTER PARTNER BIRTH DETAILS';
    drawerBody.innerHTML = `
      <div class="syn-form">
        <p class="syn-form__intro">For the comparison I need the other person's birth.</p>
        <label class="syn-form__field">
          <span class="mono mono--small">NAME · OPTIONAL</span>
          <input type="text" name="synName" placeholder="Their name" />
        </label>
        <label class="syn-form__field">
          <span class="mono mono--small">DATE OF BIRTH</span>
          <input type="date" name="synDate" />
        </label>
        <label class="syn-form__field">
          <span class="mono mono--small">TIME OF BIRTH</span>
          <input type="time" name="synTime" value="12:00" />
        </label>
        <label class="syn-form__field">
          <span class="mono mono--small">CITY OF BIRTH</span>
          <input type="text" name="synCity" placeholder="London, United Kingdom" />
        </label>
        <button class="btn btn--solid" type="button" data-action="syn-compute">Compute synastry</button>
        <p class="syn-form__note mono mono--small">YOUR OWN PROFILE MUST BE SAVED FIRST.</p>
      </div>
    `;
    const btn = drawerBody.querySelector('[data-action="syn-compute"]');
    btn.addEventListener('click', async () => {
      const f = drawerBody.querySelector('.syn-form');
      const name = f.querySelector('[name="synName"]').value.trim();
      const date = f.querySelector('[name="synDate"]').value;
      const time = f.querySelector('[name="synTime"]').value;
      const city = f.querySelector('[name="synCity"]').value.trim();
      if (!date || !time || !city) {
        drawerStatus.textContent = 'DATE, TIME, AND CITY REQUIRED';
        return;
      }
      const own = getNatalChart();
      if (!own) {
        drawerStatus.textContent = 'SAVE YOUR OWN PROFILE FIRST';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Geocoding…';
      drawerStatus.textContent = 'GEOCODING PARTNER CITY …';
      let loc;
      try { loc = await geocodeCity(city); }
      catch (e) {
        drawerStatus.textContent = `COULD NOT FIND CITY · ${(e.message || '').toUpperCase()}`;
        btn.disabled = false; btn.textContent = 'Compute synastry';
        return;
      }
      synastryPartner = buildPartnerChart({
        name, birthDate: date, birthTime: time,
        cityName: loc.name, lat: loc.lat, lon: loc.lon, tz: loc.tz,
      });
      renderSynastryReading();
    });
  }

  function renderSynastryReading() {
    const own = getNatalChart();
    if (!own) {
      drawerBody.innerHTML = `<p style="font-family:var(--serif);font-style:italic;color:var(--cream-dim)">Save your own birth profile first to compute synastry.</p>`;
      return;
    }
    if (!synastryPartner) { renderSynastryForm(); return; }

    drawerStatus.innerHTML = `<span class="dot" style="background:var(--rose);box-shadow:0 0 0 4px rgba(228,135,164,0.18)"></span>&nbsp;LIVE · CHART vs CHART`;

    const aspects = computeSynastryAspects(own, synastryPartner);
    const cat = categorizeSynastry(aspects);
    const score = synastryScore(aspects);
    const verdict = synastryVerdict(score);

    const p = synastryPartner.profile;
    const partnerName = p.name || 'Anonymous';
    const partnerDate = p.birthDate || '';
    const partnerCity = p.cityName || '';

    drawerBody.innerHTML = `
      <p class="syn-meta mono mono--small">
        PARTNER · ${partnerName.toUpperCase()} · ${partnerDate} · ${partnerCity.toUpperCase()}
      </p>
      <h4>Chemistry</h4>
      <p class="syn-cat">${describeAspects(cat.chemistry)    || 'No tight chemistry aspects within canonical orbs.'}</p>
      <h4>Communication</h4>
      <p class="syn-cat">${describeAspects(cat.communication) || 'No tight communication aspects.'}</p>
      <h4>Emotional bond</h4>
      <p class="syn-cat">${describeAspects(cat.bond)          || 'No tight emotional-bond aspects.'}</p>
      <h4>Friction</h4>
      <p class="syn-cat">${describeAspects(cat.friction)      || 'No major friction aspects under tight orbs.'}</p>
      <div class="score">
        <span class="score__label">COMPATIBILITY</span>
        <span class="score__value">${score.toFixed(1)} / 10</span>
        <span class="score__verdict">${verdict}</span>
      </div>
    `;
  }


  // drawer controller
  const drawer       = document.getElementById('drawer');
  const drawerGlyph  = document.getElementById('drawerGlyph');
  const drawerEyebrow= document.getElementById('drawerEyebrow');
  const drawerTitle  = document.getElementById('drawerTitle');
  const drawerBody   = document.getElementById('drawerBody');
  const drawerStatus = document.getElementById('drawerStatus');
  const drawerRegen  = document.getElementById('drawerRegen');
  const drawerAction = document.getElementById('drawerAction');

  let currentOracle = null;
  let currentVariantIdx = 0;
  let currentRegion = 'europe';
  let lastFocus = null;

  function openDrawer(key) {
    const o = ORACLES[key];
    if (!o) return;
    currentOracle = key;
    currentVariantIdx = 0;
    lastFocus = document.activeElement;

    drawer.dataset.tone = o.tone;
    drawerGlyph.textContent = o.glyph;
    drawerEyebrow.textContent = o.eyebrow;
    drawerTitle.textContent = o.title;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    renderOracle();

    // focus management
    setTimeout(() => {
      const close = drawer.querySelector('.drawer__close');
      if (close) close.focus();
    }, 50);
  }

  function closeDrawer() {
    cancelStream();
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderOracle() {
    const o = ORACLES[currentOracle];
    if (!o) return;
    drawerBody.innerHTML = '';

    // tools — show static intro + action
    if (o.tool) {
      drawerStatus.textContent = 'INTERACTIVE TOOL · OPEN ON PAGE';
      drawerRegen.hidden = true;
      drawerAction.hidden = false;
      drawerAction.textContent = o.action.label;
      drawerAction.onclick = () => {
        const target = document.querySelector(o.action.target);
        closeDrawer();
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
        }
      };
      streamParagraphs(drawerBody, o.paragraphs);
      return;
    }

    // atlas oracle — region picker first, then reading
    if (o.regional) {
      drawerRegen.hidden = false;
      drawerAction.hidden = true;
      drawerRegen.textContent = '↻ NEW REGION';

      const picker = document.createElement('div');
      picker.className = 'region-picker';
      ['europe', 'americas', 'asia', 'oceania', 'africa'].forEach(r => {
        const b = document.createElement('button');
        b.textContent = r.toUpperCase();
        b.className = r === currentRegion ? 'is-on' : '';
        b.onclick = () => { currentRegion = r; renderOracle(); };
        picker.appendChild(b);
      });
      drawerBody.appendChild(picker);

      const out = document.createElement('div');
      drawerBody.appendChild(out);

      const apiKey = readApiKey();
      if (apiKey) {
        drawerStatus.innerHTML = `<span class="dot" style="background:var(--cyan); animation:dotPulse 1.4s ease-in-out infinite"></span>&nbsp;CHANNELING · ${currentRegion.toUpperCase()}`;
        streamParagraphs(out, ['Listening to the sky.']);
        callOracleLive('atlas', `Region of interest: ${currentRegion}`).then(paras => {
          if (!paras || !paras.length) throw new Error('empty');
          drawerStatus.innerHTML = `<span class="dot" style="background:var(--cyan)"></span>&nbsp;LIVE · CLAUDE‑SONNET‑4`;
          streamParagraphs(out, paras);
        }).catch(err => {
          drawerStatus.textContent = `${(err.message || 'API ERROR').slice(0,40).toUpperCase()} · USING SAMPLE`;
          streamParagraphs(out, o.regions[currentRegion]);
        });
      } else {
        drawerStatus.textContent = 'PICK A REGION · ORACLE WILL READ';
        streamParagraphs(out, o.regions[currentRegion]);
      }
      return;
    }

    // synastry — structured sections + score
    if (o.structured) {
      drawerRegen.hidden = false;
      drawerAction.hidden = true;
      drawerRegen.textContent = '↻ NEW PARTNER';

      if (!synastryPartner) {
        renderSynastryForm();
      } else {
        renderSynastryReading();
      }
      return;
    }

    // standard 3-4 paragraph oracle
    drawerRegen.hidden = false;
    drawerAction.hidden = true;
    drawerRegen.textContent = '↻ NEW READING';
    const v = o.variants[currentVariantIdx % o.variants.length];
    const apiKey = readApiKey();
    const promptable = !!SYSTEM_PROMPTS[currentOracle];

    if (apiKey && promptable) {
      drawerStatus.innerHTML = `<span class="dot" style="background:var(--cyan); box-shadow:0 0 0 4px rgba(77,214,200,0.18); animation:dotPulse 1.4s ease-in-out infinite"></span>&nbsp;CHANNELING · CLAUDE‑SONNET‑4`;
      streamParagraphs(drawerBody, ['Listening to the sky.']);
      callOracleLive(currentOracle).then(paras => {
        if (currentOracle !== o.__key) {} // ignore late returns if user switched cards
        if (!paras || !paras.length) throw new Error('empty response');
        drawerStatus.innerHTML = `<span class="dot" style="background:var(--cyan); box-shadow:0 0 0 4px rgba(77,214,200,0.18)"></span>&nbsp;LIVE · CLAUDE‑SONNET‑4`;
        streamParagraphs(drawerBody, paras);
      }).catch(err => {
        const msg = (err && err.message ? err.message : 'API error').slice(0, 60).toUpperCase();
        drawerStatus.textContent = `${msg} · USING SAMPLE`;
        streamParagraphs(drawerBody, v);
      });
    } else {
      drawerStatus.textContent = apiKey ? 'SAMPLE · NO LIVE PROMPT FOR THIS MODULE' : 'SAMPLE READING · ADD API KEY FOR LIVE';
      streamParagraphs(drawerBody, v);
    }
  }

  function streamSequential(pNodes) {
    cancelStream();
    let idx = 0;
    const cursor = '<span class="cursor"></span>';
    const next = () => {
      if (idx >= pNodes.length) { activeStream = null; return; }
      const node = pNodes[idx];
      const txt = node.dataset.full;
      let c = 0;
      const step = () => {
        c = Math.min(c + 2, txt.length);
        node.innerHTML = txt.slice(0, c) + (c < txt.length ? cursor : '');
        drawerBody.scrollTop = drawerBody.scrollHeight;
        if (c < txt.length) { activeStream = setTimeout(step, 18); }
        else { idx++; activeStream = setTimeout(next, 250); }
      };
      step();
    };
    next();
  }

  // wire up cards
  document.querySelectorAll('.card[data-oracle]').forEach(card => {
    const key = card.dataset.oracle;
    card.addEventListener('click', () => openDrawer(key));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDrawer(key);
      }
    });
  });

  // close interactions
  drawer.querySelectorAll('[data-drawer-close]').forEach(el => {
    el.addEventListener('click', closeDrawer);
  });

  // regen + skip-to-end
  drawerRegen.addEventListener('click', () => {
    const o = ORACLES[currentOracle];
    if (!o) return;
    if (o.structured) {
      // synastry: clear the partner so the form re-renders
      synastryPartner = null;
    } else if (o.regional) {
      const order = ['europe', 'americas', 'asia', 'oceania', 'africa'];
      currentRegion = order[(order.indexOf(currentRegion) + 1) % order.length];
    } else if (o.variants) {
      currentVariantIdx = (currentVariantIdx + 1) % o.variants.length;
    }
    renderOracle();
  });

  // click anywhere in body during stream → fast-forward
  drawerBody.addEventListener('click', () => {
    if (!activeStream) return;
    const o = ORACLES[currentOracle];
    if (!o) return;
    if (o.tool) {
      fastForward(drawerBody, o.paragraphs);
    } else if (o.regional) {
      // re-render with no animation
      cancelStream();
      const out = drawerBody.querySelector(':scope > div:last-child');
      if (out) out.innerHTML = o.regions[currentRegion].map(p => `<p>${p}</p>`).join('');
    } else if (o.structured) {
      // for synastry, fast-forward is a no-op (no streaming animation)
    } else {
      const v = o.variants[currentVariantIdx % o.variants.length];
      fastForward(drawerBody, v);
    }
  });

  // ESC closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') {
      closeDrawer();
    }
  });


  /* ---------- API key controller ---------- */
  const apiTrigger = document.getElementById('apiKeyTrigger');
  const apiPop     = document.getElementById('apiKeyPop');
  const apiClose   = document.getElementById('apiKeyClose');
  const apiInput   = document.getElementById('apiKeyInput');
  const apiSave    = document.getElementById('apiKeySave');
  const apiClear   = document.getElementById('apiKeyClear');
  const apiStatus  = document.getElementById('apiKeyStatus');

  function refreshApiStatus() {
    const k = readApiKey();
    const isLive = !!k;
    if (apiTrigger) apiTrigger.classList.toggle('is-live', isLive);
    if (apiStatus)  apiStatus.textContent = isLive ? 'AI READING · LIVE' : 'AI READING · OFF';
    if (apiInput)   apiInput.value = k ? '••••••••' + k.slice(-4) : '';
  }

  function openApiPop() {
    if (!apiPop || !apiTrigger) return;
    apiPop.hidden = false;
    apiTrigger.setAttribute('aria-expanded', 'true');
    setTimeout(() => apiInput && apiInput.focus(), 30);
  }
  function closeApiPop() {
    if (!apiPop || !apiTrigger) return;
    apiPop.hidden = true;
    apiTrigger.setAttribute('aria-expanded', 'false');
  }

  if (apiTrigger) {
    apiTrigger.addEventListener('click', () => {
      apiPop.hidden ? openApiPop() : closeApiPop();
    });
  }
  if (apiClose) apiClose.addEventListener('click', closeApiPop);
  document.addEventListener('click', (e) => {
    if (!apiPop || apiPop.hidden) return;
    if (apiPop.contains(e.target) || apiTrigger.contains(e.target)) return;
    closeApiPop();
  });

  if (apiSave) {
    apiSave.addEventListener('click', () => {
      const v = (apiInput.value || '').trim();
      // ignore the masked placeholder unless user typed a real key
      if (v.startsWith('•')) { closeApiPop(); return; }
      if (!v) { return; }
      writeApiKey(v);
      refreshApiStatus();
      apiInput.value = '••••••••' + v.slice(-4);
      closeApiPop();
    });
  }
  if (apiClear) {
    apiClear.addEventListener('click', () => {
      writeApiKey('');
      refreshApiStatus();
    });
  }
  if (apiInput) {
    apiInput.addEventListener('focus', () => {
      // clear masked placeholder when user starts typing fresh
      if (apiInput.value.startsWith('•')) apiInput.value = '';
    });
    apiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apiSave && apiSave.click(); }
      if (e.key === 'Escape') closeApiPop();
    });
  }

  refreshApiStatus();


  /* ---------- expose a small engine API for other modules ---------- */
  window.tajnstvo = window.tajnstvo || {};
  Object.assign(window.tajnstvo, {
    getNatalChart,
    computeChart,
    findAspects,
    lonToSign,
    SIGNS,
    ensureChartFromForm,
  });

})();
