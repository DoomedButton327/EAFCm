/* ================================================================
   METTLESTATE × EA FC MOBILE — state.js
   Global application state
================================================================ */

const State = (() => {
  let _players  = [];
  let _fixtures = [];
  let _results  = [];
  let _pendingMatchImage = null;
  let _mettlestateEvents = [];
  let _currentTheme = 'godmode';
  let _autoSchedulerConfig = {
    autoGen: false,
    autoDraw: false,
    skipHolidays: true,
    skipEvents: true,
    ignoreList: [],
    lastRun: null,
    maxEncounters: 3,
    cooldownDays: 3,
  };
  let _autoSchedulerTimer = null;

  return {
    // ── Players ──────────────────────────────────────────────
    get players()  { return _players; },
    set players(v) { _players = Array.isArray(v) ? v : []; },

    // ── Fixtures ─────────────────────────────────────────────
    get fixtures()  { return _fixtures; },
    set fixtures(v) { _fixtures = Array.isArray(v) ? v : []; },

    // ── Results ──────────────────────────────────────────────
    get results()  { return _results; },
    set results(v) { _results = Array.isArray(v) ? v : []; },

    // ── Pending image ─────────────────────────────────────────
    get pendingMatchImage()  { return _pendingMatchImage; },
    set pendingMatchImage(v) { _pendingMatchImage = v; },

    // ── Mettlestate events ────────────────────────────────────
    get mettlestateEvents()  { return _mettlestateEvents; },
    set mettlestateEvents(v) { _mettlestateEvents = Array.isArray(v) ? v : []; },

    // ── Theme ─────────────────────────────────────────────────
    get currentTheme()  { return _currentTheme; },
    set currentTheme(v) { _currentTheme = v; },

    // ── Auto-scheduler ────────────────────────────────────────
    get schedulerConfig()  { return _autoSchedulerConfig; },
    set schedulerConfig(v) { _autoSchedulerConfig = { ..._autoSchedulerConfig, ...v }; },

    get schedulerTimer()  { return _autoSchedulerTimer; },
    set schedulerTimer(v) { _autoSchedulerTimer = v; },

    // ── Helper: get all match dates (from fixtures + results) ─
    getAllMatchDates() {
      const dates = new Set();
      _fixtures.forEach(f => { if (f.scheduledDate) dates.add(f.scheduledDate); });
      _results.forEach(r => { if (r.date) dates.add(r.date); });
      return Array.from(dates).sort();
    },

    // ── Group results/fixtures by date for GitHub sync ────────
    getMatchDayMap() {
      const map = {};
      const ensure = d => { if (!map[d]) map[d] = { date: d, fixtures: [], results: [] }; };
      _fixtures.forEach(f => {
        const d = f.scheduledDate || todayYMD();
        ensure(d);
        map[d].fixtures.push(f);
      });
      _results.forEach(r => {
        const d = r.date || todayYMD();
        ensure(d);
        map[d].results.push(r);
      });
      return map;
    },
  };
})();
