/* =========================================================
   ASTRA / ARCANA — front-end interactions
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

  function isRetrograde(planet, d) {
    if (planet === 'sun' || planet === 'moon') return false;
    const a = geoPlanet(planet, d);
    const b = geoPlanet(planet, d + 1);
    let diff = b.lon - a.lon;
    if (diff >  180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff < 0;
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

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(profileForm).entries());
      const cityName = (data.cityName || '').trim();
      if (!cityName) { flashNote('CITY OF BIRTH REQUIRED', 'warn'); return; }
      if (!data.birthDate || !data.birthTime) { flashNote('DATE AND TIME REQUIRED', 'warn'); return; }
      if (!window.jspdf || !window.jspdf.jsPDF) {
        flashNote('PDF LIBRARY NOT LOADED · CHECK NETWORK', 'warn');
        return;
      }

      const oldText = submitBtn ? submitBtn.textContent : null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Geocoding…'; }
      flashNote('GEOCODING CITY …');

      let loc;
      try {
        loc = await geocodeCity(cityName);
      } catch (err) {
        flashNote(`COULD NOT FIND CITY · ${(err.message || '').toUpperCase()}`, 'warn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
        return;
      }

      writeProfile({
        name:      data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        cityName:  loc.name,
        lat:       loc.lat,
        lon:       loc.lon,
        tz:        loc.tz,
      });
      profileForm.elements.cityName.value = loc.name;

      // refresh inline UI in this session (cartography, transits, ticker)
      refreshAll();

      // build and download the PDF
      if (submitBtn) submitBtn.textContent = 'Building PDF…';
      flashNote('BUILDING PDF REPORT …');
      try {
        const chart = getNatalChart();
        if (!chart) throw new Error('Could not compute chart');
        await generatePdfReport(chart);
        flashNote(`PDF DOWNLOADED · ${(chart.profile.name || 'NATIVE').toUpperCase()}`);
      } catch (err) {
        flashNote(`PDF BUILD FAILED · ${(err.message || '').toUpperCase()}`, 'warn');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText; }
      }
    });
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

  async function generatePdfReport(chart) {
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

    function pageFrame(num, total, label) {
      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('ASTRA  /  ARCANA   ·   CELESTIAL ATLAS', M, 12);
      doc.text(label, W / 2, 12, { align: 'center' });
      doc.text(`${num} / ${total}`, W - M, 12, { align: 'right' });
      rule(16);
      // footer
      doc.text('astra-arcana.vercel.app', M, H - 10);
      doc.text(new Date().toISOString().slice(0, 10), W - M, H - 10, { align: 'right' });
      rule(H - 14);
    }

    const totalPages = 3;

    // ============== PAGE 1 — COVER + PLACEMENTS ==============
    pageFrame(1, totalPages, 'NATAL REPORT');

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(54);
    doc.text('Astra', W / 2, 70, { align: 'center' });
    setText(accent);
    doc.setFont('times', 'italic');
    doc.text('Arcana', W / 2, 96, { align: 'center' });

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NATAL  ·  TROPICAL  ·  WHOLE-SIGN', W / 2, 108, { align: 'center' });

    // native block
    let y = 132;
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

    // ============== PAGE 2 — ASPECTS + ASTROCARTOGRAPHY ==============
    doc.addPage();
    pageFrame(2, totalPages, 'ASPECTS  ·  ASTROCARTOGRAPHY');

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Natal Aspects', M, 36);
    rule(40);

    const aspects = natalAspectsFor(chart, 0.9);
    let ay = 50;
    doc.setFontSize(10);
    for (const a of aspects.slice(0, 16)) {
      setText(text);
      doc.setFont('times', 'normal');
      doc.text(`${cap(a.a)}  ${a.aspect.name.toLowerCase()}  ${cap(a.b)}`, M, ay);
      setText(muted);
      doc.setFont('courier', 'normal');
      const ang = `${a.aspect.angle}°`.padStart(4);
      doc.text(`${ang}    orb ${a.exact.toFixed(1)}°`, W - M, ay, { align: 'right' });
      ay += 6;
    }
    if (!aspects.length) {
      setText(muted);
      doc.setFont('times', 'italic');
      doc.text('No tight natal aspects under canonical orbs.', M, ay);
    }

    // Astrocartography
    ay = Math.max(ay + 14, 160);
    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text('Astrocartography', M, ay);
    ay += 5;
    rule(ay);
    ay += 10;

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('MC LINE LONGITUDES — WHERE EACH PLANET CULMINATES AT BIRTH MOMENT', M, ay);
    ay += 8;

    doc.setFontSize(10);
    for (const k of ['sun','venus','mars','jupiter','saturn']) {
      const p = chart[k];
      let mcLon = p.ra - chart.gmst;
      while (mcLon >  180) mcLon -= 360;
      while (mcLon < -180) mcLon += 360;
      setText(text);
      doc.setFont('times', 'normal');
      doc.text(cap(k), M, ay);
      setText(accent);
      doc.setFont('courier', 'normal');
      const lonStr = (mcLon >= 0 ? '+' : '') + mcLon.toFixed(1) + '°';
      doc.text(lonStr.padStart(7), M + 32, ay);
      setText(muted);
      doc.setFont('helvetica', 'normal');
      doc.text(longitudeRegion(mcLon), M + 56, ay);
      ay += 6;
    }

    // ============== PAGE 3 — TRANSITS + NOTES ==============
    doc.addPage();
    pageFrame(3, totalPages, "TODAY'S TRANSITS");

    setText(text);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    const today = new Date().toISOString().slice(0, 10);
    doc.text(`Transits — ${today}`, M, 36);
    rule(40);

    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CURRENT SKY MEASURED AGAINST THE NATIVE’S CHART. TIGHT ORBS ONLY.', M, 48);

    const sky = computeChart(new Date());
    const transits = findAspects(sky, chart, 0.8).slice(0, 14);
    let ty = 60;
    doc.setFontSize(10);
    for (const a of transits) {
      setText(text);
      doc.setFont('times', 'normal');
      doc.text(
        `Transit ${cap(a.transit)}${a.retro ? ' R' : ''}   ${a.aspect.name.toLowerCase()}   natal ${cap(a.natal)}`,
        M, ty,
      );
      setText(muted);
      doc.setFont('courier', 'normal');
      const ang = `${a.aspect.angle}°`.padStart(4);
      doc.text(`${ang}    orb ${a.exactness.toFixed(1)}°`, W - M, ty, { align: 'right' });
      ty += 6;
    }
    if (!transits.length) {
      setText(muted);
      doc.setFont('times', 'italic');
      doc.text('No tight aspects active at this hour.', M, ty);
    }

    // Notes / colophon
    setText(muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    let ny = H - 60;
    doc.text('METHOD', M, ny);
    ny += 6;
    doc.setFontSize(8.5);
    doc.setFont('times', 'italic');
    doc.text(
      'Cast in-browser using Paul Schlyter’s simplified planetary formulas. Approx. ±1° accuracy across\n' +
      '1900–2100. Houses use whole-sign convention. Time-zone derived from longitude (lon/15)\n' +
      'and may be ±30 min off in India, Nepal, parts of Australia, or Newfoundland.',
      M, ny, { maxWidth: W - 2 * M },
    );

    // save
    const slug = ((chart.profile.name || 'native')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')) || 'report';
    doc.save(`astra-arcana-natal-${slug}.pdf`);
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
      note.textContent = 'PERSISTED · LOCAL STORAGE';
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

  if (themeList) {
    themeList.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-theme]');
      if (!li) return;
      themeList.querySelectorAll('li').forEach(x => x.classList.remove('is-on'));
      li.classList.add('is-on');
    });
  }

  let breathing = false;
  let breathTimer = null;
  if (orbStart) {
    orbStart.addEventListener('click', () => {
      breathing = !breathing;
      orb.classList.toggle('is-breathing', breathing);
      orbStart.textContent = breathing ? 'Pause meditation' : 'Begin meditation';

      if (breathing) {
        let phase = 0;
        const phases = ['INHALE', 'HOLD', 'EXHALE', 'REST'];
        const timings = [3500, 1000, 3500, 1000];
        const cycle = () => {
          breathLabel.textContent = phases[phase];
          breathLabel.style.color = phase === 0 ? '#ffb37a' :
                                     phase === 2 ? '#4dd6c8' : '#8a8676';
          breathTimer = setTimeout(() => {
            phase = (phase + 1) % phases.length;
            cycle();
          }, timings[phase]);
        };
        cycle();
      } else {
        clearTimeout(breathTimer);
        breathLabel.textContent = 'PAUSED';
        breathLabel.style.color = '';
      }
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
    natal: `You are the Natal Chart Oracle of Astra Arcana — a working modern Western tropical astrologer. The native's chart data is provided. Return EXACTLY 4 paragraphs separated by blank lines. No preamble, no greeting, no questions. Cover: (1) Sun and Moon together, (2) Rising sign and outward presentation, (3) two or three further planetary placements, (4) life themes. Specific and grounded. No purple prose. ~500 words total.`,
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
      drawerStatus.textContent = 'SAMPLE READING · LIVE API IN SPEC §5';
      drawerRegen.hidden = false;
      drawerAction.hidden = true;
      drawerRegen.textContent = '↻ NEW READING';

      const v = o.variants[currentVariantIdx % o.variants.length];
      const labels = { chemistry: 'Chemistry', communication: 'Communication', bond: 'Emotional bond', friction: 'Friction' };

      const sections = ['chemistry', 'communication', 'bond', 'friction'];
      const allParas = [];
      sections.forEach(k => allParas.push({ heading: labels[k], text: v[k] }));

      // render headings + stream paragraphs as we go
      sections.forEach(k => {
        const h = document.createElement('h4');
        h.textContent = labels[k];
        drawerBody.appendChild(h);
        const p = document.createElement('p');
        p.dataset.full = v[k];
        drawerBody.appendChild(p);
      });

      // score block
      const score = document.createElement('div');
      score.className = 'score';
      score.innerHTML = `
        <span class="score__label">COMPATIBILITY</span>
        <span class="score__value">${v.score}</span>
        <span class="score__verdict">${v.verdict}</span>
      `;
      drawerBody.appendChild(score);

      // stream into the existing <p> nodes one at a time
      streamSequential(drawerBody.querySelectorAll('p[data-full]'));
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
    if (o.regional) {
      // cycle to next region
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
      cancelStream();
      drawerBody.querySelectorAll('p[data-full]').forEach(p => { p.innerHTML = p.dataset.full; });
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
    if (apiStatus)  apiStatus.textContent = isLive ? 'LIVE · SONNET‑4' : 'SAMPLE MODE';
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

})();
