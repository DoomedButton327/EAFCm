/* ================================================================
   METTLESTATE × EA FC MOBILE — admin.js
   Admin panel · GitHub config · backup/restore · public leaderboard
================================================================ */

// ── Accordion toggle ──────────────────────────────────────────
function initAccordions() {
  document.querySelectorAll('.acc-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.acc-item');
      const body = item.querySelector('.acc-body');
      const isOpen = item.classList.contains('acc-open');
      // Close all
      document.querySelectorAll('.acc-item').forEach(i => {
        i.classList.remove('acc-open');
        const b = i.querySelector('.acc-body');
        if (b) b.style.maxHeight = '0';
      });
      // Open clicked if it was closed
      if (!isOpen) {
        item.classList.add('acc-open');
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
    // Init closed
    const item = header.closest('.acc-item');
    const body = item.querySelector('.acc-body');
    if (body && !item.classList.contains('acc-open')) body.style.maxHeight = '0';
  });
}

// ── GitHub config ──────────────────────────────────────────────
function saveGitHubConfig() {
  const owner  = document.getElementById('ghOwner')?.value?.trim();
  const repo   = document.getElementById('ghRepo')?.value?.trim();
  const branch = document.getElementById('ghBranch')?.value?.trim() || 'main';
  const token  = document.getElementById('ghToken')?.value?.trim();
  if (!owner || !repo || !token) { toast('Owner, repo, and token are required.', 'error'); return; }
  GH.save(owner, repo, branch, token);
  toast('GitHub config saved!', 'success');
}

function disconnectGitHub() {
  if (!confirm('Disconnect GitHub? Data will remain local.')) return;
  GH.disconnect();
  toast('Disconnected from GitHub.', 'info');
}

async function testGitHubConnection() {
  const btn = document.getElementById('btn-test-gh');
  if (btn) btn.disabled = true;
  const result = await GH.testConnection();
  toast(result.msg, result.ok ? 'success' : 'error');
  if (btn) btn.disabled = false;
}

async function loadFromGitHub() {
  const data = await GH.loadRemoteData();
  if (!data) return;
  State.players  = data.players  || [];
  State.fixtures = data.fixtures || [];
  State.results  = data.results  || [];
  Storage.saveAll();
  renderAll();
  toast('Data loaded from GitHub!', 'success');
}

async function forceSync() {
  await GH.syncDataNow();
}

// ── Public leaderboard ────────────────────────────────────────
function savePublicRepoConfig() {
  const owner  = document.getElementById('pubOwner')?.value?.trim();
  const repo   = document.getElementById('pubRepo')?.value?.trim();
  const branch = document.getElementById('pubBranch')?.value?.trim() || 'main';
  const token  = document.getElementById('pubToken')?.value?.trim();
  if (!owner || !repo || !token) { toast('All public repo fields required.', 'error'); return; }
  Storage.savePubRepo({ owner, repo, branch, token });
  toast('Public repo config saved!', 'success');
}

function loadPublicRepoConfigUI() {
  const cfg = Storage.loadPubRepo();
  if (!cfg) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('pubOwner',  cfg.owner);
  set('pubRepo',   cfg.repo);
  set('pubBranch', cfg.branch);
  set('pubToken',  cfg.token);
}

async function pushPublicLeaderboard() {
  const sorted = sortedPlayers();
  const data = {
    players: sorted,
    updatedAt: new Date().toISOString(),
    matchesPlayed: State.results.length,
  };
  const ok = await GH.pushPublicLeaderboard(JSON.stringify(data, null, 2));
  toast(ok ? 'Leaderboard pushed!' : 'Push failed — check config.', ok ? 'success' : 'error');
}

// ── Add player form ───────────────────────────────────────────
function submitAddPlayer() {
  const name     = document.getElementById('newPlayerName')?.value?.trim();
  const username = document.getElementById('newPlayerUsername')?.value?.trim();
  const phone    = document.getElementById('newPlayerPhone')?.value?.trim();
  if (addPlayer(name, username, phone)) {
    document.getElementById('newPlayerName').value = '';
    document.getElementById('newPlayerUsername').value = '';
    document.getElementById('newPlayerPhone').value = '';
  }
}

// ── Import players from file ──────────────────────────────────
function importPlayersFromFile() {
  const fileEl = document.getElementById('playerImport');
  if (!fileEl?.files?.[0]) { toast('Select a .txt file first.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => importPlayersFromText(ev.target.result);
  reader.readAsText(fileEl.files[0]);
}

// ── Score log form ────────────────────────────────────────────
function submitLogScore() { logScore(); }

// ── Generate fixtures form ────────────────────────────────────
function submitGenerateFixtures() {
  const mode = document.querySelector('input[name="gen-mode"]:checked')?.value || 'random';
  generateFixtures(mode);
}

function submitAddManualFixture() {
  const home = document.getElementById('manualHome')?.value?.trim();
  const away = document.getElementById('manualAway')?.value?.trim();
  const date = document.getElementById('manualDate')?.value?.trim();
  addManualFixture(home, away, date || todayYMD());
  const hEl = document.getElementById('manualHome');
  const aEl = document.getElementById('manualAway');
  if (hEl) hEl.value = '';
  if (aEl) aEl.value = '';
}

// ── Backup / Restore ──────────────────────────────────────────
function exportBackup() { Storage.exportBackup(); }

function importBackupFile() {
  const fileEl = document.getElementById('importBackup');
  if (!fileEl?.files?.[0]) { toast('Select a backup JSON file.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      Storage.importBackup(ev.target.result);
      renderAll();
      toast('Backup restored!', 'success');
    } catch(e) { toast('Invalid backup file: ' + e.message, 'error'); }
  };
  reader.readAsText(fileEl.files[0]);
}

// ── Reset league ──────────────────────────────────────────────
function resetLeague() {
  if (!confirm('⚠ RESET all league data? This cannot be undone!')) return;
  if (!confirm('Are you absolutely sure? All players, fixtures, and results will be cleared.')) return;
  State.players  = [];
  State.fixtures = [];
  State.results  = [];
  Storage.saveAll();
  sendDiscordWebhook({ type: 'leagueReset' });
  renderAll();
  toast('League data reset.', 'info');
}

// ── Gemini key ────────────────────────────────────────────────
function saveGeminiKey() {
  const keyEl = document.getElementById('gemini-api-key');
  const key = keyEl?.value?.trim();
  if (!key) { toast('Enter a Gemini API key.', 'error'); return; }
  Storage.saveGeminiKey(key);
  const status = document.getElementById('gemini-key-status');
  if (status) status.innerHTML = '<span style="color:var(--acid)"><i class="fas fa-check"></i> Key saved</span>';
  toast('Gemini API key saved.', 'success');
}

// ── Pending registrations ─────────────────────────────────────
function renderPendingRegistrations() {
  const list = Storage.loadPendingRegistrations();
  const el = document.getElementById('pending-regs-list');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="muted-text">No pending registrations.</div>';
    return;
  }
  el.innerHTML = list.map((r, i) => `
    <div class="pending-reg-card">
      <div class="preg-name">${esc(r.name)} <span class="preg-username">@${esc(r.username)}</span></div>
      <div class="preg-phone">${esc(r.phone)}</div>
      ${r.note ? `<div class="preg-note">${esc(r.note)}</div>` : ''}
      <div class="preg-actions">
        <button class="btn-sm btn-success" onclick="acceptPendingReg(${i})"><i class="fas fa-check"></i> Add to League</button>
        <button class="btn-sm btn-danger"  onclick="dismissPendingReg(${i})"><i class="fas fa-times"></i> Dismiss</button>
      </div>
    </div>`).join('');
}

function acceptPendingReg(index) {
  const list = Storage.loadPendingRegistrations();
  const reg = list[index];
  if (!reg) return;
  addPlayer(reg.name, reg.username, reg.phone);
  list.splice(index, 1);
  Storage.save(Storage.KEYS.pending, list);
  renderPendingRegistrations();
}

function dismissPendingReg(index) {
  const list = Storage.loadPendingRegistrations();
  list.splice(index, 1);
  Storage.save(Storage.KEYS.pending, list);
  renderPendingRegistrations();
}
