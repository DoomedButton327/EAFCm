/* ================================================================
   METTLESTATE × EA FC MOBILE — players.js
   Player CRUD · stats updates · management table render
================================================================ */

function saveData() {
  Storage.saveAll();
  GH.syncData();
  renderAll();
}

function sortedPlayers() {
  return [...State.players].sort((a, b) => {
    const dp = (b.points || 0) - (a.points || 0);
    if (dp !== 0) return dp;
    const dg = ((b.gf || 0) - (b.ga || 0)) - ((a.gf || 0) - (a.ga || 0));
    if (dg !== 0) return dg;
    return (b.gf || 0) - (a.gf || 0);
  });
}

function getPlayer(username) {
  return State.players.find(p => p.username === username) || null;
}

function addPlayer(name, username, phone) {
  if (!name || !username) { toast('Name and username required.', 'error'); return false; }
  if (getPlayer(username)) { toast(`Username "${username}" already exists.`, 'error'); return false; }
  const p = {
    name, username, phone: phone || '',
    played: 0, wins: 0, draws: 0, losses: 0, points: 0,
    gf: 0, ga: 0, form: [],
    postponements: POSTPONEMENTS_PER_SEASON,
    suspended: false,
  };
  State.players.push(p);
  saveData();
  sendDiscordWebhook({ type: 'playerAdded', name, username });
  toast(`${name} added!`, 'success');
  return true;
}

function removePlayer(username) {
  const p = getPlayer(username);
  if (!p) return;
  if (!confirm(`Remove ${p.name} (${p.username}) from the league? This cannot be undone.`)) return;
  State.players = State.players.filter(pl => pl.username !== username);
  saveData();
  sendDiscordWebhook({ type: 'playerRemoved', name: p.name, username });
  toast(`${p.name} removed.`, 'info');
}

function toggleSuspend(username) {
  const p = getPlayer(username);
  if (!p) return;
  p.suspended = !p.suspended;
  saveData();
  sendDiscordWebhook({ type: 'suspension', player: p.name, suspended: p.suspended });
  toast(`${p.name} ${p.suspended ? 'suspended' : 'reactivated'}.`, p.suspended ? 'error' : 'success');
}

function updatePlayerStats(homeUser, awayUser, homeGoals, awayGoals, result) {
  const home = getPlayer(homeUser);
  const away = getPlayer(awayUser);
  if (!home || !away) return;

  home.played = (home.played || 0) + 1;
  away.played = (away.played || 0) + 1;
  home.gf = (home.gf || 0) + homeGoals;
  home.ga = (home.ga || 0) + awayGoals;
  away.gf = (away.gf || 0) + awayGoals;
  away.ga = (away.ga || 0) + homeGoals;

  if (result === 'home') {
    home.wins = (home.wins || 0) + 1;
    home.points = (home.points || 0) + 3;
    away.losses = (away.losses || 0) + 1;
    home.form = [...(home.form || []), 'W'].slice(-10);
    away.form = [...(away.form || []), 'L'].slice(-10);
  } else if (result === 'away') {
    away.wins = (away.wins || 0) + 1;
    away.points = (away.points || 0) + 3;
    home.losses = (home.losses || 0) + 1;
    away.form = [...(away.form || []), 'W'].slice(-10);
    home.form = [...(home.form || []), 'L'].slice(-10);
  } else {
    home.draws = (home.draws || 0) + 1;
    away.draws = (away.draws || 0) + 1;
    home.points = (home.points || 0) + 1;
    away.points = (away.points || 0) + 1;
    home.form = [...(home.form || []), 'D'].slice(-10);
    away.form = [...(away.form || []), 'D'].slice(-10);
  }
}

// ── Recalculate all stats from scratch (used after editing a result) ──
function recalculateAllPlayerStats() {
  // Reset every player's stats to zero
  State.players.forEach(p => {
    p.played = 0; p.wins = 0; p.draws = 0; p.losses = 0;
    p.points = 0; p.gf = 0; p.ga = 0; p.form = [];
  });
  // Replay all results in chronological order by loggedAt / date
  const sorted = [...State.results].sort((a, b) => {
    const ta = a.loggedAt || (a.date + 'T00:00:00');
    const tb = b.loggedAt || (b.date + 'T00:00:00');
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  sorted.forEach(r => updatePlayerStats(r.home, r.away, r.homeGoals, r.awayGoals, r.result));
}

function importPlayersFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0;
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const [name, username, phone] = parts;
      if (!getPlayer(username)) {
        State.players.push({
          name, username, phone: phone || '',
          played: 0, wins: 0, draws: 0, losses: 0, points: 0,
          gf: 0, ga: 0, form: [],
          postponements: POSTPONEMENTS_PER_SEASON,
          suspended: false,
        });
        added++;
      }
    }
  });
  if (added > 0) {
    saveData();
    sendDiscordWebhook({ type: 'playersImported', count: added, total: State.players.length });
    toast(`${added} player${added !== 1 ? 's' : ''} imported!`, 'success');
  } else {
    toast('No new players found.', 'info');
  }
}

// ── Render ────────────────────────────────────────────────────
function renderPlayerManagement() {
  const filter = (document.getElementById('player-search-input')?.value || '').toLowerCase();
  const tbody = document.getElementById('playersBody');
  if (!tbody) return;

  const list = sortedPlayers().filter(p =>
    !filter || p.name.toLowerCase().includes(filter) || p.username.toLowerCase().includes(filter)
  );

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-cell"><i class="fas fa-users"></i><br>No players yet</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, i) => {
    const gd = (p.gf || 0) - (p.ga || 0);
    const tokClass = (p.postponements || 0) <= 2 ? 'tok-low' : 'tok-ok';
    const suspClass = p.suspended ? 'row-suspended' : '';
    return `
      <tr class="${suspClass}" style="animation-delay:${i * 0.03}s">
        <td class="rank-cell">${i + 1}</td>
        <td class="player-info-cell">
          <div class="player-name-main">${esc(p.name)}${p.suspended ? '<span class="susp-badge">SUSP</span>' : ''}</div>
          <div class="player-phone">${esc(p.phone)}</div>
        </td>
        <td class="username-cell">${esc(p.username)}</td>
        <td class="tok-cell ${tokClass}">${p.postponements ?? POSTPONEMENTS_PER_SEASON}/${POSTPONEMENTS_PER_SEASON}</td>
        <td class="record-cell">${p.wins||0}W ${p.draws||0}D ${p.losses||0}L</td>
        <td class="gd-cell">${gd > 0 ? '+'+gd : gd}</td>
        <td class="pts-cell">${p.points||0}</td>
        <td class="action-cell">
          <button class="btn-icon btn-suspend" onclick="toggleSuspend('${esc(p.username)}')" title="${p.suspended ? 'Reactivate' : 'Suspend'}">
            <i class="fas fa-${p.suspended ? 'play' : 'ban'}"></i>
          </button>
          <button class="btn-icon btn-delete" onclick="removePlayer('${esc(p.username)}')" title="Remove player">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function updatePlayerDatalist() {
  const dl = document.getElementById('player-datalist');
  if (!dl) return;
  dl.innerHTML = State.players.map(p => `<option value="${esc(p.username)}">${esc(p.name)}</option>`).join('');
}

function updatePlayerCount() {
  const el = document.getElementById('player-count-label');
  if (el) el.textContent = `${State.players.length} player${State.players.length !== 1 ? 's' : ''}`;
}

function openPlayerProfile(username) {
  const p = getPlayer(username);
  if (!p) return;
  const modal = document.getElementById('player-modal');
  const content = document.getElementById('player-modal-content');
  if (!modal || !content) return;

  const gd = (p.gf || 0) - (p.ga || 0);
  const wr = p.played ? Math.round((p.wins / p.played) * 100) : 0;
  const form = buildFormBadges(p.form || []);

  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-avatar"><i class="fas fa-user-circle"></i></div>
      <div>
        <div class="modal-player-name">${esc(p.name)}</div>
        <div class="modal-player-username">@${esc(p.username)}</div>
        ${p.suspended ? '<div class="modal-susp-badge">SUSPENDED</div>' : ''}
      </div>
    </div>
    <div class="modal-stats-grid">
      <div class="modal-stat"><span class="ms-val">${p.points||0}</span><span class="ms-lbl">Points</span></div>
      <div class="modal-stat"><span class="ms-val">${p.played||0}</span><span class="ms-lbl">Played</span></div>
      <div class="modal-stat"><span class="ms-val">${p.wins||0}</span><span class="ms-lbl">Wins</span></div>
      <div class="modal-stat"><span class="ms-val">${p.draws||0}</span><span class="ms-lbl">Draws</span></div>
      <div class="modal-stat"><span class="ms-val">${p.losses||0}</span><span class="ms-lbl">Losses</span></div>
      <div class="modal-stat"><span class="ms-val">${wr}%</span><span class="ms-lbl">Win Rate</span></div>
      <div class="modal-stat"><span class="ms-val">${p.gf||0}</span><span class="ms-lbl">Goals For</span></div>
      <div class="modal-stat"><span class="ms-val">${p.ga||0}</span><span class="ms-lbl">Goals Against</span></div>
      <div class="modal-stat"><span class="ms-val ${gd >= 0 ? 'gd-pos' : 'gd-neg'}">${gd > 0 ? '+'+gd : gd}</span><span class="ms-lbl">Goal Diff</span></div>
    </div>
    <div class="modal-form-row">
      <div class="modal-form-label">Last 5 Matches</div>
      <div class="modal-form-badges">${form || '<span class="muted">No matches yet</span>'}</div>
    </div>
    <div class="modal-tokens">
      <i class="fas fa-clock"></i> Postponements: <strong>${p.postponements ?? POSTPONEMENTS_PER_SEASON}/${POSTPONEMENTS_PER_SEASON}</strong>
    </div>
  `;

  modal.classList.add('modal-open');
  document.body.classList.add('modal-active');
}

function closePlayerModal() {
  const modal = document.getElementById('player-modal');
  if (modal) modal.classList.remove('modal-open');
  document.body.classList.remove('modal-active');
}
