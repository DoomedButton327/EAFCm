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

// ── DATA PATHS (New structure v3) ─────────────────────────────
// All players in one JSON array
function playersJsonPath()  { return 'data/players.json'; }
// Active fixtures in one JSON array
function fixturesJsonPath() { return 'data/fixtures.json'; }
// index.json lists all dates that have game data
function leagueIndexPath()  { return 'data/index.json'; }
// All matches for a date in one JSON array
function dayMatchesPath(dateStr) { return `data/games/${dateStr}/matches.json`; }
// Images folder stays the same
function matchImagesPath(dateStr) { return `data/games/${dateStr}/images/`; }

// ── UNIQUE ID ─────────────────────────────────────────────────
function shortUID() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── SA PUBLIC HOLIDAYS 2025–2026 ─────────────────────────────
const SA_HOLIDAYS = {
  '2025-01-01': "New Year's Day",
  '2025-03-21': 'Human Rights Day',
  '2025-04-18': 'Good Friday',
  '2025-04-21': 'Family Day',
  '2025-04-27': 'Freedom Day',
  '2025-05-01': 'Workers Day',
  '2025-06-16': 'Youth Day',
  '2025-08-09': "National Women's Day",
  '2025-09-24': 'Heritage Day',
  '2025-12-16': 'Day of Reconciliation',
  '2025-12-25': 'Christmas Day',
  '2025-12-26': 'Day of Goodwill',
  '2026-01-01': "New Year's Day",
  '2026-03-21': 'Human Rights Day',
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Family Day',
  '2026-04-27': 'Freedom Day',
  '2026-05-01': 'Workers Day',
  '2026-06-16': 'Youth Day',
  '2026-08-10': "National Women's Day (observed)",
  '2026-09-24': 'Heritage Day',
  '2026-12-16': 'Day of Reconciliation',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Day of Goodwill',
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
