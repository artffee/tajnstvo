/* =========================================================
   TAJNSTVO — 45-day Sky Companion
   On-page only: a daily card for 45 days, derived from the
   strongest transit aspect of each day to the native's chart.
   State (cards + completed flags) persists in localStorage.
   ========================================================= */

(function () {
  'use strict';

  const STORAGE = 'tajnstvo:program-v1';
  const TOTAL_DAYS = 45;

  /* ---------- transit templates ---------- */
  // Keyed by transit planet + aspect quality (conj | soft | hard).
  const T = {
    sun: {
      conj: {
        theme:      'A reset day. The centre of you is recalibrating.',
        action:     'Spend an hour with yourself, off all screens.',
        reflection: 'What did you remember about yourself?',
      },
      soft: {
        theme:      'You are easier to see today than yesterday.',
        action:     'Take one visible action you have been postponing.',
        reflection: 'What did being seen feel like?',
      },
      hard: {
        theme:      'Identity friction. Someone reflects what you do not want to be.',
        action:     'Notice the reflection without arguing with it.',
        reflection: 'What truth did the friction contain?',
      },
    },
    moon: {
      conj: {
        theme:      'The mood owns the day. Let it teach instead of decide.',
        action:     'Name the feeling out loud, even alone.',
        reflection: 'What did the feeling actually want?',
      },
      soft: {
        theme:      'Emotional weather is favourable. Soften by ten percent.',
        action:     'Reach toward one person you have been avoiding.',
        reflection: 'What did the contact change?',
      },
      hard: {
        theme:      'Inner turbulence asks to be felt without performing.',
        action:     'Cancel one nonessential thing to make room.',
        reflection: 'What needed the space you just gave it?',
      },
    },
    mercury: {
      conj: {
        theme:      'Mind sharpens. Conversations land deeper than usual.',
        action:     'Write the email that has been drafting itself.',
        reflection: 'What surprised you in the answer?',
      },
      soft: {
        theme:      'Words move easily today. Speak the unspoken thing.',
        action:     'Have one difficult conversation now while it is easy.',
        reflection: 'What clarified that was foggy yesterday?',
      },
      hard: {
        theme:      'Communication slips. Re-read before sending.',
        action:     'Pause two extra seconds before each reply.',
        reflection: 'Where did the wires almost cross?',
      },
    },
    venus: {
      conj: {
        theme:      'Beauty registers more sharply. Receive what shows up.',
        action:     'Buy yourself one small pleasure without justifying it.',
        reflection: 'What landed as gift?',
      },
      soft: {
        theme:      'Relationships open softly. The room is on your side.',
        action:     'Make a gesture of care that costs you nothing.',
        reflection: 'Who received it most?',
      },
      hard: {
        theme:      'Values friction. What you wanted yesterday looks different now.',
        action:     'Postpone any finance or commitment decision by one day.',
        reflection: 'Which value clarified through the friction?',
      },
    },
    mars: {
      conj: {
        theme:      'Energy concentrates. Direct it before it directs you.',
        action:     'Train, walk, or build something physical for thirty minutes.',
        reflection: 'Where did the energy actually land?',
      },
      soft: {
        theme:      'The body knows where to go today. The instrument is ready.',
        action:     'Begin the thing you have been edging up to.',
        reflection: 'What momentum did you find?',
      },
      hard: {
        theme:      'Heat surfaces. Slow it down before it speaks.',
        action:     'Move the body twenty minutes before any decision.',
        reflection: 'What was under the heat?',
      },
    },
    jupiter: {
      conj: {
        theme:      'Expansion is the keyword. Hold the larger frame.',
        action:     'Say yes to one invitation that scares you slightly.',
        reflection: 'What did the bigger frame reveal?',
      },
      soft: {
        theme:      'Doors open. Walk through one before second-guessing.',
        action:     'Make one ask that feels slightly too big.',
        reflection: 'What arrived that you did not expect?',
      },
      hard: {
        theme:      'Over-promise risk. Edit, do not expand.',
        action:     'Take one thing off the calendar.',
        reflection: 'What did less of, mean more of?',
      },
    },
    saturn: {
      conj: {
        theme:      'A structural moment. The foundations ask attention.',
        action:     'Do one thing for your future self that present-you resists.',
        reflection: 'What did discipline give back?',
      },
      soft: {
        theme:      'Slow, real work pays today. Show up steady.',
        action:     'Block ninety minutes for the long-arc project.',
        reflection: 'What did patience build?',
      },
      hard: {
        theme:      'A limit or delay. The block is information, not a verdict.',
        action:     'Document the obstacle precisely; do not push.',
        reflection: 'What is the limit teaching?',
      },
    },
    uranus: {
      conj: {
        theme:      'Awakening or disruption. Trust the new direction.',
        action:     'Try one small thing differently.',
        reflection: 'What broke open that needed to?',
      },
      soft: {
        theme:      'Original ideas land easily. Capture them in writing.',
        action:     'Sketch the unconventional version of your current problem.',
        reflection: 'What new path appeared?',
      },
      hard: {
        theme:      'Sudden-change pressure. The status quo is loosening.',
        action:     'Observe what is shifting; do not over-react.',
        reflection: 'What is being made room for?',
      },
    },
    neptune: {
      conj: {
        theme:      'Dream consciousness near the surface. Reality is softer.',
        action:     'Make art, listen to music, walk near water.',
        reflection: 'What image stayed with you?',
      },
      soft: {
        theme:      'Intuition is loud. Follow the first impression.',
        action:     'Trust one hunch you cannot justify.',
        reflection: 'What truth arrived sideways?',
      },
      hard: {
        theme:      'Confusion or escape pull. Clarify tomorrow.',
        action:     'Sleep on every decision today.',
        reflection: 'What turned out clearer the next morning?',
      },
    },
  };

  function dayQuality(aspect) {
    if (!aspect) return null;
    const n = aspect.aspect.name;
    if (n === 'CONJ') return 'conj';
    if (n === 'TRINE' || n === 'SEXTILE') return 'soft';
    return 'hard';
  }

  function aspectScore(a) {
    const personal = ['sun','moon','mercury','venus','mars'];
    let w = 0;
    if (personal.includes(a.transit)) w += 1;
    if (personal.includes(a.natal))   w += 1;
    // tighter aspects win
    w += Math.max(0, 1 - a.exactness / (a.aspect.orb || 1)) * 2.2;
    return w;
  }

  function pickDayAspect(skyChart, natalChart) {
    const T = window.tajnstvo;
    if (!T || !T.findAspects) return null;
    let aspects = T.findAspects(skyChart, natalChart, 0.6);
    if (!aspects.length) aspects = T.findAspects(skyChart, natalChart, 1.0);
    if (!aspects.length) return null;
    aspects.sort((a, b) => aspectScore(b) - aspectScore(a));
    return aspects[0];
  }

  function formatDate(d) {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function shortDate(d) {
    const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return wd + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  const ASPECT_VERB = { CONJ:'conjunct', SEXTILE:'sextile', SQUARE:'square', TRINE:'trine', OPP:'opposite' };

  function buildCard(index, date, aspect) {
    if (!aspect) {
      return {
        index, date: date.toISOString().slice(0, 10),
        transit: '—',
        theme:      'A quiet sky day. Use it to rest.',
        action:     'Do less than usual. Notice what fills the room.',
        reflection: 'What does an unscheduled hour want?',
      };
    }
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const q = dayQuality(aspect);
    const tpl = (T[aspect.transit] && T[aspect.transit][q]) || T.sun[q] || T.sun.conj;
    return {
      index,
      date: date.toISOString().slice(0, 10),
      transit: cap(aspect.transit) + (aspect.retro ? ' R' : '') +
               ' ' + ASPECT_VERB[aspect.aspect.name] + ' natal ' + cap(aspect.natal) +
               '  (orb ' + aspect.exactness.toFixed(1) + '°)',
      theme:      tpl.theme,
      action:     tpl.action,
      reflection: tpl.reflection,
    };
  }


  /* ---------- state ---------- */
  let state = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
  }

  function todayIndex() {
    if (!state) return 0;
    const start = new Date(state.startDate + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }


  /* ---------- DOM ---------- */
  let intro, active, currentBlock, timeline, beginBtn, doneBtn, resetBtn;
  let dayNum, dateEl, transitEl, themeEl, actionEl, reflectionEl;
  let viewingIndex = 0;

  function mount() {
    intro       = document.getElementById('programIntro');
    active      = document.getElementById('programActive');
    currentBlock = document.getElementById('programCurrent');
    timeline    = document.getElementById('programTimeline');
    beginBtn    = document.getElementById('programBegin');
    doneBtn     = document.getElementById('programDone');
    resetBtn    = document.getElementById('programReset');
    dayNum      = document.getElementById('programDayNum');
    dateEl      = document.getElementById('programDate');
    transitEl   = document.getElementById('programTransit');
    themeEl     = document.getElementById('programTheme');
    actionEl    = document.getElementById('programAction');
    reflectionEl = document.getElementById('programReflection');
    const note  = document.getElementById('programNote');

    if (!intro || !beginBtn) return;

    beginBtn.addEventListener('click', begin);
    doneBtn.addEventListener('click', markDone);
    resetBtn.addEventListener('click', endProgram);

    state = load();
    if (state) {
      showActive();
    } else {
      showIntro();
    }
  }

  function showIntro() {
    intro.hidden = false;
    active.hidden = true;
    const note = document.getElementById('programNote');
    if (note) note.textContent =
      'Save your birth profile above first (Generate soul report). The program reads from your in-memory chart and snapshots it.';
  }

  function showActive() {
    intro.hidden = true;
    active.hidden = false;
    viewingIndex = Math.max(0, Math.min(TOTAL_DAYS - 1, todayIndex()));
    renderTimeline();
    renderCurrent(viewingIndex);
  }

  async function begin() {
    const api = window.tajnstvo;
    if (!api || !api.getNatalChart) {
      flash('ENGINE NOT READY');
      return;
    }
    const chart = api.getNatalChart();
    if (!chart) {
      flash('SAVE YOUR BIRTH PROFILE FIRST');
      return;
    }
    beginBtn.disabled = true;
    beginBtn.textContent = 'Casting forty-five days…';

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // build all 45 cards (synchronous; no waiting on network)
    const cards = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + i);
      const noon = new Date(dayDate);
      noon.setHours(12, 0, 0, 0);
      const sky = api.computeChart(noon);
      const aspect = pickDayAspect(sky, chart);
      cards.push(buildCard(i, dayDate, aspect));
    }

    state = {
      startDate: start.toISOString().slice(0, 10),
      cards,
      completed: [],
      profileSnapshot: {
        name: chart.profile.name,
        birthDate: chart.profile.birthDate,
        cityName: chart.city.name,
      },
    };
    persist();
    beginBtn.disabled = false;
    beginBtn.textContent = 'Begin the 45-day program';
    showActive();
  }

  function endProgram() {
    if (!confirm('End the 45-day program? Your progress will be cleared.')) return;
    state = null;
    try { localStorage.removeItem(STORAGE); } catch {}
    viewingIndex = 0;
    showIntro();
  }

  function markDone() {
    if (!state) return;
    const idx = viewingIndex;
    if (!state.completed.includes(idx)) {
      state.completed.push(idx);
      persist();
      renderTimeline();
      renderCurrent(idx);
    }
  }

  function renderTimeline() {
    if (!timeline || !state) return;
    timeline.innerHTML = '';
    const today = todayIndex();
    state.cards.forEach((card, i) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'prog-pill mono mono--small';
      pill.textContent = i + 1;
      if (i === today)       pill.classList.add('is-today');
      if (i === viewingIndex) pill.classList.add('is-viewing');
      if (state.completed.includes(i)) pill.classList.add('is-done');
      if (i > today)         pill.classList.add('is-future');
      pill.addEventListener('click', () => {
        viewingIndex = i;
        renderTimeline();
        renderCurrent(i);
      });
      timeline.appendChild(pill);
    });
  }

  function renderCurrent(i) {
    if (!state) return;
    const card = state.cards[i];
    if (!card) return;
    const today = todayIndex();
    const isFuture = i > today;
    const isComplete = state.completed.includes(i);

    dayNum.textContent = String(i + 1);
    const d = new Date(card.date + 'T12:00:00');
    dateEl.textContent = formatDate(d);
    transitEl.textContent = card.transit;
    themeEl.textContent = card.theme;
    actionEl.textContent = card.action;
    reflectionEl.textContent = card.reflection;

    if (isFuture) {
      doneBtn.disabled = true;
      doneBtn.textContent = 'Not yet';
      currentBlock.dataset.state = 'future';
    } else if (isComplete) {
      doneBtn.disabled = true;
      doneBtn.textContent = '✓ Completed';
      currentBlock.dataset.state = 'done';
    } else {
      doneBtn.disabled = false;
      doneBtn.textContent = '✓ Mark complete';
      currentBlock.dataset.state = 'open';
    }
  }

  function flash(msg) {
    const note = document.getElementById('programNote');
    if (!note) return;
    note.textContent = msg;
    note.style.color = 'var(--amber)';
    setTimeout(() => { note.style.color = ''; }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    setTimeout(mount, 0);
  }
})();
