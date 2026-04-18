/* ================================================================
   METTLESTATE × EA FC MOBILE — config.js
   Constants · SAST utilities · SA Public Holidays
================================================================ */

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1490038911446024373/hF9PEIg5K4Aafed80pXjXg7GbHqYAB05kn2q-l96_9DpYsJ7KrU5hL50PrZUWo-6l1sy';
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
function toYM(d) {
  return toYMD(d).slice(0, 7); // YYYY-MM
}
function todayYMD() { return toYMD(); }
function todayYM()  { return toYM(); }

// ── DATA PATHS ────────────────────────────────────────────────
function playerDataPath()   { return 'data/player-data.json'; }
function leagueIndexPath()  { return 'data/index.json'; }

// New unique-per-game file structure
function playerFilePath(username) {
  // Sanitize username for filenames
  const safe = String(username).replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `data/players/${safe}.txt`;
}
function gameFilePath(dateStr, home, away, uid) {
  const safeHome = String(home).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const safeAway = String(away).replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `data/games/${dateStr}/${safeHome}_vs_${safeAway}_${uid}.txt`;
}
function matchImagesPath(dateStr) {
  return `data/games/${dateStr}/images/`;
}

// ── UNIQUE ID ─────────────────────────────────────────────────
// 8-char hex ensures game filenames never collide even on bulk pushes
function shortUID() {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── TXT SERIALIZERS ───────────────────────────────────────────
function serializePlayerTxt(p) {
  return [
    `# Mettlestate × EA FC Mobile — Player File`,
    `# Auto-generated: ${new Date().toISOString()}`,
    ``,
    `name=${p.name || ''}`,
    `username=${p.username || ''}`,
    `phone=${p.phone || ''}`,
    `played=${p.played || 0}`,
    `wins=${p.wins || 0}`,
    `draws=${p.draws || 0}`,
    `losses=${p.losses || 0}`,
    `points=${p.points || 0}`,
    `gf=${p.gf || 0}`,
    `ga=${p.ga || 0}`,
    `form=${(p.form || []).join(',')}`,
    `postponements=${p.postponements ?? POSTPONEMENTS_PER_SEASON}`,
    `suspended=${p.suspended ? 'true' : 'false'}`,
    `addedAt=${p.addedAt || new Date().toISOString()}`,
  ].join('\n');
}

function serializeGameTxt(r) {
  const winner = r.result === 'home' ? r.home : r.result === 'away' ? r.away : 'DRAW';
  return [
    `# Mettlestate × EA FC Mobile — Game Record`,
    `# Auto-generated: ${r.loggedAt || new Date().toISOString()}`,
    ``,
    `id=${r.id}`,
    `uid=${r.uid || ''}`,
    `date=${r.date}`,
    `home=${r.home}`,
    `away=${r.away}`,
    `homeGoals=${r.homeGoals}`,
    `awayGoals=${r.awayGoals}`,
    `result=${r.result}`,
    `winner=${winner}`,
    `loggedAt=${r.loggedAt || new Date().toISOString()}`,
    `editedAt=${r.editedAt || ''}`,
    `imageUrl=${r.imageUrl || ''}`,
    `forfeit=${r.forfeit ? 'true' : 'false'}`,
    `autoWin=${r.autoWin ? 'true' : 'false'}`,
    `autoForfeit=${r.autoForfeit ? 'true' : 'false'}`,
  ].join('\n');
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
  '2025-08-09': 'National Women\'s Day',
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toast(msg, type = 'info', duration = 3000) {
  const area = document.getElementById('toast-area');
  if (!area) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  area.appendChild(t);
  setTimeout(() => t.classList.add('toast-show'), 10);
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 400);
  }, duration);
}

function uniqueId() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function buildFormBadges(form = []) {
  return form.slice(-5).map(r => {
    const cls = r === 'W' ? 'form-w' : r === 'D' ? 'form-d' : 'form-l';
    return `<span class="form-badge ${cls}">${r}</span>`;
  }).join('');
}
