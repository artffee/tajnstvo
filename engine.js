/* Tajnstvo astronomical engine, shared by both experiences. */
(()=>{
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
    if (!profile) return null;
    return {name:profile.cityName,lat:profile.lat,lon:profile.lon,timeZone:profile.timeZone,tz:profile.tz};
  }
  function profileToUTC(profile) {
    if (!profile || !profile.birthDate || !profile.birthTime || !profile.timeZone) return null;
    return window.TajnstvoBirth.toUTC(profile.birthDate,profile.birthTime,profile.timeZone,profile.occurrence);
  }
  async function geocodeCity(query) {
    const known=window.TajnstvoBirth.exactCity(query);
    if(known) return known;
    const cities=await window.TajnstvoBirth.searchCities(query);
    if(cities.length!==1) throw new Error('Please select your city on the homepage before opening the tools.');
    return cities[0];
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
  try { localStorage.removeItem(APIKEY_KEY); } catch {}
  let currentProfile = null;

  function readProfile() { return currentProfile; }
  function writeProfile(p) { currentProfile = p; }

  function readApiKey() {
    try { return sessionStorage.getItem(APIKEY_KEY) || ''; }
    catch { return ''; }
  }
  function writeApiKey(v) {
    try { localStorage.removeItem(APIKEY_KEY); if(v) sessionStorage.setItem(APIKEY_KEY,v); else sessionStorage.removeItem(APIKEY_KEY); } catch {}
  }

  function getNatalChart() {
    const p = readProfile();
    if (!p) return null;
    const utc = profileToUTC(p);
    if (!utc || isNaN(utc.getTime())) return null;
    const loc = profileLocation(p);
    const chart = computeChart(utc);
    chart.profile = p;
    chart.city = {...loc,tz:window.TajnstvoBirth.offsetAt(utc.getTime(),p.timeZone)};
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



window.TajnstvoEngine={RAD,DEG,CITIES,ELEMENTS,PLANET_KEYS,PLANET_GLYPH,PLANET_COLOR,SIGNS,ASPECTS_DEFS,norm360,julianDay,schlyterDay,gmstDeg,obliquity,solveKepler,elementsAt,eclToEq,geoSun,geoMoon,geoPlanet,geoPluto,geoChiron,isRetrograde,SIGN_RULER,DIGNITIES,dignityOf,computeAscendant,computeMC,computeChart,profileLocation,profileToUTC,geocodeCity,lonToSign,lifePathNumber,meanLunarNorthNode,reduceNumber,PYTH,nameNumber,birthdayNumber,houseOfPlanet,planetsInHouse,findAspects,STORAGE_KEY,APIKEY_KEY,currentProfile,readProfile,writeProfile,readApiKey,writeApiKey,getNatalChart,summarizeChart,REPORT_KEYS,BODY_NAME,ordinal,nodeAxis,reportAspects,stelliaeOf,mcLineLon,lifePathSteps,buildChartFacts};
})();
