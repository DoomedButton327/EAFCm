/* ================================================================
   METTLESTATE × EA FC MOBILE — calendar.js
   Monthly grid · Mettlestate events · SAST clock · Auto-scheduler
================================================================ */

let _calYear  = null;
let _calMonth = null;
let _clockTimer = null;

function initCalendar() {
  const now = getSASTNow();
  _calYear  = now.getUTCFullYear();
  _calMonth = now.getUTCMonth();
  renderCalendar();
  renderUpcomingPanel();
  startClock();
  checkDailyEventFetch();
}

// ── SAST Live Clock ───────────────────────────────────────────
function startClock() {
  if (_clockTimer) clearInterval(_clockTimer);
  _clockTimer = setInterval(updateClock, 1000);
  updateClock();
}
function updateClock() {
  const el = document.getElementById('sast-clock');
  if (!el) return;
  const now = getSASTNow();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  const date = now.toUTCString().split(' ').slice(1, 4).join(' ');
  el.innerHTML = `<span class="clock-time">${hh}:${mm}:${ss}</span><span class="clock-label">SAST · ${date}</span>`;
}

// ── Calendar grid ─────────────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthLabel = document.getElementById('cal-month-label');
  if (!grid || _calYear === null) return;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (monthLabel) monthLabel.textContent = `${MONTHS[_calMonth]} ${_calYear}`;

  const today = todayYMD();
  const fixtureDates = new Set(State.fixtures.map(f => f.scheduledDate).filter(Boolean));

  const firstDay = new Date(Date.UTC(_calYear, _calMonth, 1));
  const lastDay  = new Date(Date.UTC(_calYear, _calMonth + 1, 0));
  const startDow = (firstDay.getUTCDay() + 6) % 7; // Monday=0

  let html = '';
  // Day headers
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
    html += `<div class="cal-day-header">${d}</div>`;
  });

  // Blank cells before first day
  for (let i = 0; i < startDow; i++) html += '<div class="cal-cell cal-blank"></div>';

  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    const dateStr = `${_calYear}-${String(_calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const holiday = holidayName(dateStr);
    const isMEEvent = State.mettlestateEvents.some(e => e.date === dateStr);
    const hasFixture = fixtureDates.has(dateStr);

    const dots = [
      holiday   ? '<span class="cal-dot dot-holiday" title="' + holiday + '"></span>' : '',
      isMEEvent ? '<span class="cal-dot dot-event" title="Mettlestate Event"></span>' : '',
      hasFixture ? '<span class="cal-dot dot-fixture" title="Fixtures scheduled"></span>' : '',
    ].join('');

    html += `
      <div class="cal-cell ${isToday ? 'cal-today' : ''} ${holiday ? 'cal-holiday' : ''}"
           title="${holiday || (isMEEvent ? 'Mettlestate Event' : '')}">
        <span class="cal-day-num">${d}</span>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }

  grid.innerHTML = html;
}

function calPrev() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendar();
}
function calNext() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  renderCalendar();
}

// ── Upcoming panel ────────────────────────────────────────────
function renderUpcomingPanel() {
  const panel = document.getElementById('upcoming-list');
  if (!panel) return;
  const today = getSASTNow();
  const items = [];

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    if (SA_HOLIDAYS[dateStr]) items.push({ date: dateStr, label: SA_HOLIDAYS[dateStr], type: 'holiday', days: i });
    State.mettlestateEvents.filter(e => e.date === dateStr).forEach(e => {
      items.push({ date: dateStr, label: e.name || 'Mettlestate Event', type: 'event', days: i });
    });
  }

  if (!items.length) {
    panel.innerHTML = '<div class="muted-text">No events in the next 30 days.</div>';
    return;
  }

  panel.innerHTML = items.map(it => `
    <div class="upcoming-item ${it.type === 'holiday' ? 'upcoming-holiday' : 'upcoming-event'}">
      <div class="upcoming-label">${esc(it.label)}</div>
      <div class="upcoming-meta">
        <span>${it.date}</span>
        <span class="upcoming-days">${it.days === 0 ? 'TODAY' : `in ${it.days} day${it.days !== 1 ? 's' : ''}`}</span>
      </div>
    </div>`).join('');
}

// ── Mettlestate events fetch ───────────────────────────────────
async function checkDailyEventFetch() {
  const { events, lastFetch } = Storage.loadMEEvents();
  State.mettlestateEvents = events;

  if (!lastFetch || toYMD(new Date(lastFetch)) !== todayYMD()) {
    await fetchMettlestateEvents();
  }
}

async function fetchMettlestateEvents() {
  const spinner = document.getElementById('event-fetch-status');
  if (spinner) spinner.textContent = 'Fetching…';

  const TARGET = 'https://www.mettlestate.com/games/ea-fc-mobile/events/';
  const PROXIES = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET)}`,
    `https://corsproxy.io/?${encodeURIComponent(TARGET)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(TARGET)}`,
  ];

  let html = null;
  for (const url of PROXIES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 200) { html = text; break; }
    } catch { /* try next */ }
  }

  if (!html) {
    if (spinner) spinner.textContent = 'Could not fetch (using cached)';
    return;
  }

  try {
    const events = parseMettlestateEvents(html);
    State.mettlestateEvents = events;
    Storage.saveMEEvents(events);
    if (spinner) spinner.textContent = events.length ? `${events.length} events loaded` : 'No events found';
    sendDiscordWebhook({ type: 'eventSync', count: events.length });
    renderCalendar();
    renderUpcomingPanel();
  } catch (e) {
    if (spinner) spinner.textContent = 'Parse error (using cached)';
  }
}

function parseMettlestateEvents(html) {
  const events = [];

  // Strategy 1: Look for structured event cards — date near a title/heading within ~500 chars
  // Mettlestate uses patterns like <h3>Cup Name</h3>...<span>2026-04-30</span>
  // or data-date attributes, ISO dates near headings, etc.

  // Strip HTML tags for a cleaned text pass
  const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                       .replace(/<style[\s\S]*?<\/style>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
                       .replace(/\s+/g, ' ');

  // Match ISO dates (YYYY-MM-DD) anywhere in the stripped text
  const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
  let m;
  while ((m = dateRegex.exec(stripped)) !== null) {
    const date = m[1];
    // Only future-ish dates (within the next 2 years) from today
    if (date < '2024-01-01' || date > '2028-12-31') continue;
    if (events.find(e => e.date === date)) continue;

    // Grab ~120 chars before and after the date to find an event name
    const ctx = stripped.slice(Math.max(0, m.index - 120), m.index + 80);
    // Look for a word sequence that looks like an event name (Capitalised words)
    const titleMatch = ctx.match(/([A-Z][A-Za-z0-9&' ]{4,60}(?:Cup|League|Tournament|Season|Event|Open|Series|Championship|Grand Prix|Finals?|Qualifier|Invitational))/i);
    const name = titleMatch ? titleMatch[1].trim() : 'Mettlestate Event';
    events.push({ date, name });
  }

  // Strategy 2: data-date or datetime attributes in raw HTML
  const attrRegex = /(?:data-date|datetime|data-start)=['"]([\d]{4}-[\d]{2}-[\d]{2})/gi;
  while ((m = attrRegex.exec(html)) !== null) {
    const date = m[1];
    if (!events.find(e => e.date === date)) {
      events.push({ date, name: 'Mettlestate Event' });
    }
  }

  // Sort by date and cap
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events.slice(0, 100);
}

// ── Auto-scheduler ─────────────────────────────────────────────
function loadAutoScheduleConfig() {
  const saved = Storage.loadScheduler();
  if (saved) State.schedulerConfig = saved;
  syncSchedulerUI();
}

function syncSchedulerUI() {
  const cfg = State.schedulerConfig;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
  set('sched-autogen', cfg.autoGen);
  set('sched-autodraw', cfg.autoDraw);
  set('sched-skip-holidays', cfg.skipHolidays);
  set('sched-skip-events', cfg.skipEvents);
  const il = document.getElementById('sched-ignore-list');
  if (il) il.value = (cfg.ignoreList || []).join(', ');
}

function saveAutoScheduleConfig() {
  const get = id => { const el = document.getElementById(id); return el ? el.checked : false; };
  const ignoreEl = document.getElementById('sched-ignore-list');
  const ignoreList = ignoreEl ? ignoreEl.value.split(',').map(s => s.trim()).filter(Boolean) : [];
  State.schedulerConfig = { autoGen: get('sched-autogen'), autoDraw: get('sched-autodraw'), skipHolidays: get('sched-skip-holidays'), skipEvents: get('sched-skip-events'), ignoreList };
  Storage.saveScheduler(State.schedulerConfig);
  toast('Scheduler config saved.', 'success');
}

function startAutoScheduler() {
  if (State.schedulerTimer) clearInterval(State.schedulerTimer);
  State.schedulerTimer = setInterval(autoSchedulerTick, 60000);
  autoSchedulerTick(); // immediate check
}

function autoSchedulerTick() {
  const cfg = State.schedulerConfig;
  if (!cfg.autoGen && !cfg.autoDraw) return;

  const now = getSASTNow();
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const today = todayYMD();

  // Only fire between 02:00 and 02:05 SAST
  if (h !== AUTO_SCHEDULER_WINDOW.start || m > AUTO_SCHEDULER_WINDOW.tolerance) return;
  if (cfg.lastRun === today) return;

  State.schedulerConfig = { ...cfg, lastRun: today };
  Storage.saveScheduler(State.schedulerConfig);

  // Check holiday
  if (cfg.skipHolidays && isHoliday(today)) {
    sendDiscordWebhook({ type: 'autoSkip', reason: `SA Public Holiday — ${holidayName(today)}`, date: today });
    return;
  }
  // Check Mettlestate event
  if (cfg.skipEvents && State.mettlestateEvents.some(e => e.date === today)) {
    sendDiscordWebhook({ type: 'autoSkip', reason: 'Mettlestate Event Day', date: today });
    return;
  }

  if (cfg.autoGen) {
    const active = State.players.filter(p => !p.suspended);
    const ignoreList = (cfg.ignoreList || []).map(u => u.toLowerCase());
    const pool = active.filter(p => !ignoreList.includes(p.username.toLowerCase()));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const pairs = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) pairs.push([shuffled[i].username, shuffled[i+1].username]);
    const newFix = pairs.map(([h, a]) => ({ id: uniqueId(), home: h, away: a, postponedBy: null, scheduledDate: today }));
    State.fixtures.push(...newFix);
    sendDiscordWebhook({ type: 'autoGenerate', count: newFix.length, date: today });
  }

  if (cfg.autoDraw) {
    const arr = State.fixtures.filter(f => !f.postponedBy);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i].home, arr[j].home] = [arr[j].home, arr[i].home];
      [arr[i].away, arr[j].away] = [arr[j].away, arr[i].away];
    }
    sendDiscordWebhook({ type: 'autoDraw', count: arr.length });
  }

  saveData();
}
