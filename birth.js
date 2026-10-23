/* Shared birth-place and civil-time handling. No longitude/15 time-zone guesses. */
(function (root) {
  'use strict';
  const cities = [
    ['Sofia, Bulgaria',42.6977,23.3219,'Europe/Sofia','София'],
    ['Plovdiv, Bulgaria',42.1354,24.7453,'Europe/Sofia','Пловдив'],
    ['Varna, Bulgaria',43.2141,27.9147,'Europe/Sofia','Варна'],
    ['Burgas, Bulgaria',42.5048,27.4626,'Europe/Sofia','Бургас'],
    ['London, United Kingdom',51.5074,-0.1278,'Europe/London','Лондон'],
    ['New York, United States',40.7128,-74.006,'America/New_York','Ню Йорк'],
    ['Miami, United States',25.7617,-80.1918,'America/New_York','Маями'],
    ['Fort Lauderdale, United States',26.1224,-80.1373,'America/New_York','Форт Лодърдейл'],
    ['Los Angeles, United States',34.0522,-118.2437,'America/Los_Angeles','Лос Анджелис'],
    ['Paris, France',48.8566,2.3522,'Europe/Paris','Париж'],
    ['Berlin, Germany',52.52,13.405,'Europe/Berlin','Берлин'],
    ['Lisbon, Portugal',38.7223,-9.1393,'Europe/Lisbon','Лисабон'],
    ['Athens, Greece',37.9838,23.7275,'Europe/Athens','Атина'],
    ['Istanbul, Türkiye',41.0082,28.9784,'Europe/Istanbul','Истанбул'],
    ['Tokyo, Japan',35.6762,139.6503,'Asia/Tokyo','Токио'],
    ['Sydney, Australia',-33.8688,151.2093,'Australia/Sydney','Сидни'],
    ['Mumbai, India',19.076,72.8777,'Asia/Kolkata','Мумбай'],
    ['Kathmandu, Nepal',27.7172,85.324,'Asia/Kathmandu','Катманду'],
    ['São Paulo, Brazil',-23.5505,-46.6333,'America/Sao_Paulo','Сао Пауло'],
    ['Cape Town, South Africa',-33.9249,18.4241,'Africa/Johannesburg','Кейптаун'],
    ['Mexico City, Mexico',19.4326,-99.1332,'America/Mexico_City','Мексико'],
    ['Reykjavík, Iceland',64.1466,-21.9426,'Atlantic/Reykjavik','Рейкявик']
  ].map(([name,lat,lon,timeZone,alias])=>({name,lat,lon,timeZone,alias}));
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function matches(query) {
    const q=normalize(query);
    return cities.filter(c=>normalize(c.name).includes(q)||normalize(c.alias).includes(q)).slice(0,7);
  }
  function exactCity(query) {
    const q=normalize(query);
    return cities.find(c=>[c.name,c.name.split(',')[0],c.alias].some(s=>normalize(s)===q)) || null;
  }
  function offsetAt(ms, timeZone) {
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(ms/1000)*1000)/3600000;
  }
  function toUTC(date, time, timeZone, occurrence) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)) throw new Error('INVALID_DATE');
    const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
    const wall=Date.UTC(y,m-1,d,h,min), check=new Date(wall);
    if(y<1900||y>2100||m<1||m>12||h>23||min>59||check.getUTCDate()!==d||check.getUTCMonth()!==m-1) throw new Error('INVALID_DATE');
    const offsets=new Set([-36,-24,-12,0,12,24,36].map(n=>offsetAt(wall+n*3600000,timeZone)));
    const valid=[...offsets].map(o=>wall-o*3600000).filter(ms=>Math.abs(ms+offsetAt(ms,timeZone)*3600000-wall)<1000).sort((a,b)=>a-b);
    if(!valid.length) throw new Error('NONEXISTENT_TIME');
    if(valid.length>1&&!['earlier','later'].includes(occurrence)) throw new Error('AMBIGUOUS_TIME');
    return new Date(occurrence==='later'?valid[valid.length-1]:valid[0]);
  }
  async function searchCities(query, signal) {
    const local=matches(query);
    if(local.length) return local;
    const response=await fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(query)+'&limit=5&lang=en',{signal});
    if(!response.ok) throw new Error('CITY_SEARCH_FAILED');
    const data=await response.json();
    return (data.features||[]).filter(f=>f.geometry?.coordinates?.length===2).map(f=>{
      const [lon,lat]=f.geometry.coordinates,p=f.properties||{};
      const name=[p.city||p.town||p.village||p.name,p.state,p.country].filter(Boolean).filter((s,i,a)=>a.indexOf(s)===i).join(', ');
      const timeZone=typeof root.tzlookup==='function'?root.tzlookup(lat,lon):null;
      return {name,lat,lon,timeZone};
    }).filter(c=>c.timeZone&&Number.isFinite(c.lat)&&Number.isFinite(c.lon));
  }
  root.TajnstvoBirth={cities,matches,exactCity,toUTC,offsetAt,searchCities};
})(globalThis);
