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

async function exportStandingsImage() {
  const el = document.getElementById('standings-tab');
  if (!el || !window.html2canvas) { toast('Export not available.', 'error'); return; }
  toast('Generating image…', 'info');
  const theme = THEMES[State.currentTheme] || THEMES.godmode;
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: theme.vars['--theme-poster-bg'] || '#050a0e',
      scale: 2,
      useCORS: true,
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `standings-${todayYMD()}.png`;
    a.click();
    toast('Standings exported!', 'success');
  } catch(e) { toast('Export failed.', 'error'); }
}

async function exportFixturesImage() {
  const el = document.getElementById('fixtures-tab');
  if (!el || !window.html2canvas) { toast('Export not available.', 'error'); return; }
  const theme = THEMES[State.currentTheme] || THEMES.godmode;
  try {
    const canvas = await html2canvas(el, { backgroundColor: theme.vars['--theme-poster-bg'], scale: 2, useCORS: true });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `fixtures-${todayYMD()}.png`;
    a.click();
    toast('Fixtures exported!', 'success');
  } catch { toast('Export failed.', 'error'); }
}

async function exportRulesImage() {
  const el = document.getElementById('rules-tab');
  if (!el || !window.html2canvas) { toast('Export not available.', 'error'); return; }
  const theme = THEMES[State.currentTheme] || THEMES.godmode;
  try {
    const canvas = await html2canvas(el, { backgroundColor: theme.vars['--theme-poster-bg'], scale: 2, useCORS: true });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `rules-${todayYMD()}.png`;
    a.click();
    toast('Rules exported!', 'success');
  } catch { toast('Export failed.', 'error'); }
}
