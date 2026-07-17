/* ================================================================
   METTLESTATE × EA FC MOBILE — config.js
   Constants · SAST utilities · SA Public Holidays
================================================================ */

// ── Discord webhook is stored securely in localStorage ────────
// Set it in Admin → Discord Webhook. Never hardcode it here.
// If you use the GitHub Actions deployment, it gets injected via
// the DISCORD_WEBHOOK_URL secret at build time (see README).
const DISCORD_WEBHOOK_PLACEHOLDER = '__DISCORD_WEBHOOK_URL__';

function getDiscordWebhookUrl() {
  // 1. Use localStorage value if saved from Admin panel
  try {
    const stored = Storage?.loadDiscordWebhook?.() || '';
    if (stored && !stored.includes('__')) return stored;
  } catch(e) {}
  // 2. Fall back to build-time injected value (GitHub Actions)
  if (DISCORD_WEBHOOK_PLACEHOLDER && !DISCORD_WEBHOOK_PLACEHOLDER.includes('__')) {
    return DISCORD_WEBHOOK_PLACEHOLDER;
  }
  return '';
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const POSTPONEMENTS_PER_SEASON = 20;
const FORFEIT_SCORE = { winner: 3, loser: 0 };
const SYNC_DEBOUNCE_MS = 600;
const AUTO_SCHEDULER_WINDOW = { start: 2, end: 2, tolerance: 5 }; // 02:00–02:05 SAST

// ── SAST (GMT+2) ─────────────────────────────────────────────
function getSASTDate(d) {
  const now = d ? new Date(d) : new Date();
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
}
function getSASTNow() { return getSASTDate(); }
function toYMD(d) {
  const s = getSASTDate(d);
  return s.toISOString().slice(0, 10);
}
function toYM(d) { return toYMD(d).slice(0, 7); }
function todayYMD() { return toYMD(); }
function todayYM()  { return toYM(); }

// ── DATA PATHS (v4 — flat structure, single-commit sync) ──────
// Why v4: v3 wrote one matches.json PER DATE, which meant a full
// sync fired one GitHub API commit per day that had games (50+ as
// the season went on). Each commit is a separate network round
// trip that can fail on its own, so syncs got flaky as the season
// grew. v4 keeps everything in 4 flat files and writes them all in
// ONE atomic commit via the Git Trees API (see github.js flush()).
function playersJsonPath()  { return 'data/players.json'; }
function fixturesJsonPath() { return 'data/fixtures.json'; }
function resultsJsonPath()  { return 'data/results.json'; }
function leagueIndexPath()  { return 'data/index.json'; }
// Legacy v3 path, kept only so a one-time migration can read old
// per-day files if they still exist in the repo. Not written to anymore.
function dayMatchesPath(dateStr) { return `data/games/${dateStr}/matches.json`; }
// Images folder stays the same — one file per screenshot, these
// aren't part of the JSON-data sync so they don't add to commit count.
function matchImagesPath(dateStr) { return `data/games/${dateStr}/images/`; }

// ── UNIQUE ID ─────────────────────────────────────────────────
function shortUID() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── SA PUBLIC HOLIDAYS 2025–2026 ─────────────────────────────
const SA_HOLIDAYS = {
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-03-21': 'Human Rights Day',
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Family Day',
  '2026-04-27': 'Freedom Day',
  '2026-05-01': 'Workers Day',
  '2026-06-16': 'Youth Day',
  '2026-08-09': "National Women's Day",
  '2026-08-10': "National Women's Day (observed)",
  '2026-09-24': 'Heritage Day',
  '2026-12-16': 'Day of Reconciliation',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Day of Goodwill',

  // 2027
  '2027-01-01': "New Year's Day",
  '2027-03-21': 'Human Rights Day',
  '2027-03-22': 'Human Rights Day (observed)',
  '2027-03-26': 'Good Friday',
  '2027-03-29': 'Family Day',
  '2027-04-27': 'Freedom Day',
  '2027-05-01': 'Workers Day',
  '2027-06-16': 'Youth Day',
  '2027-08-09': "National Women's Day",
  '2027-09-24': 'Heritage Day',
  '2027-12-16': 'Day of Reconciliation',
  '2027-12-25': 'Christmas Day',
  '2027-12-26': 'Day of Goodwill',
  '2027-12-27': 'Day of Goodwill (observed)',
};

function isHoliday(dateStr) { return !!SA_HOLIDAYS[dateStr]; }
function holidayName(dateStr) { return SA_HOLIDAYS[dateStr] || null; }

// ── HELPERS ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function toast(msg, type = 'info', duration = 3000) {
  const area = document.getElementById('toast-area');
  if (!area) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  area.appendChild(t);
  setTimeout(() => t.classList.add('toast-show'), 10);
  setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, duration);
}

function uniqueId() { return Date.now() + Math.floor(Math.random() * 10000); }

function buildFormBadges(form = []) {
  return form.slice(-5).map(r => {
    const cls = r === 'W' ? 'form-w' : r === 'D' ? 'form-d' : 'form-l';
    return `<span class="form-badge ${cls}">${r}</span>`;
  }).join('');
}
