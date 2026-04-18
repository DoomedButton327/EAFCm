/* ================================================================
   METTLESTATE × EA FC MOBILE — standings.js
   Leaderboard · podium · stats ticker · export poster
================================================================ */

function renderLeaderboard() {
  const sorted = sortedPlayers();
  const tbody = document.getElementById('leaderboardBody');
  if (!tbody) return;

  // Podium
  const podium = document.getElementById('podium-area');
  if (podium) {
    if (sorted.length >= 3) {
      podium.style.display = 'grid';
      const [first, second, third] = sorted;
      podium.innerHTML = `
        <div class="podium-card rank-2">
          <div class="podium-medal">🥈</div>
          <div class="podium-rank">2ND</div>
          <div class="podium-name">${esc(second.username)}</div>
          <div class="podium-pts"><strong>${second.points || 0}</strong> pts</div>
        </div>
        <div class="podium-card rank-1">
          <div class="podium-medal">🥇</div>
          <div class="podium-rank">1ST</div>
          <div class="podium-name">${esc(first.username)}</div>
          <div class="podium-pts"><strong>${first.points || 0}</strong> pts</div>
        </div>
        <div class="podium-card rank-3">
          <div class="podium-medal">🥉</div>
          <div class="podium-rank">3RD</div>
          <div class="podium-name">${esc(third.username)}</div>
          <div class="podium-pts"><strong>${third.points || 0}</strong> pts</div>
        </div>`;
    } else {
      podium.style.display = 'none';
    }
  }

  // Stats ticker
  updateStatsTicker();

  // Table
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-cell"><i class="fas fa-trophy"></i><br>No players yet</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map((p, i) => {
    const rank = i + 1;
    const gd   = (p.gf || 0) - (p.ga || 0);
    const gdStr = gd > 0
      ? `<span class="gd-pos">+${gd}</span>`
      : gd < 0 ? `<span class="gd-neg">${gd}</span>`
      : `<span class="muted">${gd}</span>`;
    const posClass = rank <= 3 ? `pos-${rank}` : 'pos-n';
    const zone = rank <= 3 ? 'zone-champ' : '';
    const form = buildFormBadges(p.form || []);
    const susp = p.suspended ? '<span class="susp-badge">SUSP</span>' : '';

    return `
      <tr class="${zone} ${p.suspended ? 'row-suspended' : ''}" style="animation-delay:${i * 0.025}s">
        <td><span class="pos-badge ${posClass}">${rank}</span></td>
        <td class="player-col" onclick="openPlayerProfile('${esc(p.username)}')" style="cursor:pointer">
          <div class="player-cell-name">${esc(p.name)}${susp}</div>
          <div class="player-cell-username">@${esc(p.username)}</div>
        </td>
        <td>${p.played || 0}</td>
        <td>${p.wins || 0}</td>
        <td>${p.draws || 0}</td>
        <td>${p.losses || 0}</td>
        <td>${p.gf || 0}</td>
        <td>${p.ga || 0}</td>
        <td>${gdStr}</td>
        <td class="pts-col"><strong>${p.points || 0}</strong></td>
        <td class="form-col">${form}</td>
      </tr>`;
  }).join('');
}

function updateStatsTicker() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const totalGoals = State.results.reduce((s, r) => s + (r.homeGoals || 0) + (r.awayGoals || 0), 0);
  set('stat-players',  State.players.length);
  set('stat-matches',  State.results.length);
  set('stat-goals',    totalGoals);
  set('stat-pending',  State.fixtures.length);

  const sub = document.getElementById('standings-subtitle');
  if (sub) sub.textContent = `${State.players.length} players · ${State.results.length} matches played`;
}

// ── Shared poster capture helper ──────────────────────────────
function captureElement(elementId, filename, successMsg) {
  const el = document.getElementById(elementId);
  if (!el || !window.html2canvas) { toast('Export not available.', 'error'); return; }
  el.style.position   = 'fixed';
  el.style.top        = '0';
  el.style.left       = '0';
  el.style.visibility = 'visible';
  el.style.zIndex     = '-1';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html2canvas(el, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#0A0A0C', logging: false,
        onclone: doc => {
          const c = doc.getElementById(elementId);
          if (c) { c.style.visibility = 'visible'; c.style.position = 'static'; c.style.left = '0'; c.style.top = '0'; c.style.zIndex = '1'; }
        },
      }).then(canvas => {
        el.style.position   = 'absolute';
        el.style.top        = '0';
        el.style.left       = '-9999px';
        el.style.visibility = 'hidden';
        el.style.zIndex     = '-1';
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast(successMsg, 'success');
      }).catch(() => {
        el.style.position   = 'absolute';
        el.style.left       = '-9999px';
        el.style.visibility = 'hidden';
        toast('Export failed. Try again.', 'error');
      });
    });
  });
}

// ── Get season label from scheduler config or fallback ────────
function _posterSeasonLabel() {
  const cfg = Storage.loadScheduler();
  return cfg?.seasonLabel || 'EA FC MOBILE LEAGUE';
}

// ── Fixtures poster ───────────────────────────────────────────
function exportFixturesImage() {
  if (!State.fixtures.length) { toast('No fixtures to export', 'error'); return; }

  const sub = document.getElementById('poster-fixture-sub');
  if (sub) sub.textContent = _posterSeasonLabel();

  const list = document.getElementById('poster-fixture-list');
  list.innerHTML = '';

  const active    = State.fixtures.filter(f => !f.postponedBy);
  const postponed = State.fixtures.filter(f =>  f.postponedBy);

  if (active.length) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(76,217,100,0.1);border:2px solid rgba(76,217,100,0.3);color:#4cd964;padding:10px;margin:12px 0;border-radius:8px;text-align:center;font-weight:700;font-size:0.9rem;letter-spacing:1px;';
    hdr.textContent = '▶ ACTIVE FIXTURES';
    list.appendChild(hdr);

    active.forEach(f => {
      const hp = State.players.find(p => p.username === f.home);
      const ap = State.players.find(p => p.username === f.away);
      const row = document.createElement('div');
      row.className = 'poster-match-row';
      row.innerHTML = `
        <div class="poster-match-home">
          <div class="poster-player-name">${esc(hp?.name || f.home)}</div>
          <div class="poster-player-details">${hp?.phone || 'N/A'} · ${esc(f.home)}</div>
        </div>
        <div class="poster-match-vs">VS</div>
        <div class="poster-match-away">
          <div class="poster-player-name">${esc(ap?.name || f.away)}</div>
          <div class="poster-player-details">${ap?.phone || 'N/A'} · ${esc(f.away)}</div>
        </div>`;
      list.appendChild(row);
    });
  }

  if (postponed.length) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(255,149,0,0.1);border:2px solid rgba(255,149,0,0.3);color:#FF9500;padding:10px;margin:12px 0;border-radius:8px;text-align:center;font-weight:700;font-size:0.9rem;letter-spacing:1px;';
    hdr.textContent = '⏸ POSTPONED FIXTURES';
    list.appendChild(hdr);

    postponed.forEach(f => {
      const hp = State.players.find(p => p.username === f.home);
      const ap = State.players.find(p => p.username === f.away);
      const row = document.createElement('div');
      row.className = 'poster-match-row';
      row.style.opacity = '0.6';
      row.innerHTML = `
        <div class="poster-match-home">
          <div class="poster-player-name">${esc(hp?.name || f.home)}</div>
          <div class="poster-player-details">${hp?.phone || 'N/A'} · ${esc(f.home)}</div>
        </div>
        <div class="poster-match-vs" style="background:rgba(255,149,0,0.15);color:#FF9500;">⏸</div>
        <div class="poster-match-away">
          <div class="poster-player-name">${esc(ap?.name || f.away)}</div>
          <div class="poster-player-details">${ap?.phone || 'N/A'} · ${esc(f.away)}</div>
        </div>
        <div style="text-align:center;font-size:0.7rem;color:#FF9500;margin-top:6px;font-weight:600;">Postponed by ${esc(f.postponedBy)}</div>`;
      list.appendChild(row);
    });
  }

  captureElement('fixture-capture-area', `Mettlestate_Fixtures_${todayYMD()}.png`, 'Fixtures image downloaded!');
}

// ── Standings poster ──────────────────────────────────────────
function exportStandingsImage() {
  if (!State.players.length) { toast('No players to export', 'error'); return; }

  const sub = document.getElementById('poster-lb-sub');
  if (sub) sub.textContent = _posterSeasonLabel();

  const sorted    = sortedPlayers();
  const container = document.getElementById('poster-lb-table');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'poster-lb-header';
  header.innerHTML = `<div>#</div><div>PLAYER</div><div>P</div><div>W</div><div>D</div><div>L</div><div>PTS</div>`;
  container.appendChild(header);

  sorted.forEach((p, i) => {
    const rank     = i + 1;
    const posClass = rank === 1 ? 'poster-lb-pos-1' : rank === 2 ? 'poster-lb-pos-2' : rank === 3 ? 'poster-lb-pos-3' : '';
    const row      = document.createElement('div');
    row.className  = 'poster-lb-row';
    row.innerHTML  = `
      <div class="${posClass}">${rank}</div>
      <div>
        ${esc(p.name)}
        <div style="font-size:0.85em;color:#aaa;margin-top:2px;">${esc(p.username)}</div>
      </div>
      <div>${p.played || 0}</div>
      <div>${p.wins   || 0}</div>
      <div>${p.draws  || 0}</div>
      <div>${p.losses || 0}</div>
      <div class="poster-lb-pts">${p.points || 0}</div>`;
    container.appendChild(row);
  });

  captureElement('lb-capture-area', `Mettlestate_Standings_${todayYMD()}.png`, 'Standings image downloaded!');
}

// ── Rules poster ──────────────────────────────────────────────
function exportRulesImage() {
  const sub = document.getElementById('poster-rules-sub');
  if (sub) sub.textContent = _posterSeasonLabel();

  const liveRules = document.getElementById('rules-content') || document.getElementById('rules-tab');
  if (liveRules) {
    document.getElementById('poster-rules-content').innerHTML = liveRules.innerHTML;
  }
  captureElement('rules-capture-area', `Mettlestate_Rules_${todayYMD()}.png`, 'Rules image downloaded!');
}
