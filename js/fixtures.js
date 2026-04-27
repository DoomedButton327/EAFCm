/* ================================================================
   METTLESTATE × EA FC MOBILE — fixtures.js
   Generate · postpone · forfeit · render fixture cards
================================================================ */

// ── Cooldown helper: get sorted list of unique matchdays (dates with results/fixtures) ─
function getMatchdays() {
  const dates = new Set();
  State.results.forEach(r => { if (r.date) dates.add(r.date); });
  State.fixtures.forEach(f => { if (f.scheduledDate) dates.add(f.scheduledDate); });
  return Array.from(dates).sort(); // ascending
}

// Returns true if the pair versed each other within the last `cooldownDays` matchdays
function isOnCooldown(usernameA, usernameB, cooldownDays) {
  const a = usernameA.toLowerCase();
  const b = usernameB.toLowerCase();
  const matchdays = getMatchdays();
  const today = todayYMD();

  // Find the most recent matchday (excluding today's not-yet-generated) where they played
  let lastMet = null;
  State.results.forEach(r => {
    const h = r.home.toLowerCase(), aw = r.away.toLowerCase();
    if ((h === a && aw === b) || (h === b && aw === a)) {
      if (!lastMet || r.date > lastMet) lastMet = r.date;
    }
  });

  if (!lastMet) return false; // never played, no cooldown

  // How many distinct matchdays have passed since they last met?
  const daysSince = matchdays.filter(d => d > lastMet && d <= today).length;
  return daysSince < cooldownDays;
}

// ── Head-to-head count helper ─────────────────────────────────
function getH2HCount(usernameA, usernameB) {
  const a = usernameA.toLowerCase();
  const b = usernameB.toLowerCase();
  // Count both played + scheduled
  const played = State.results.filter(r => {
    const h = r.home.toLowerCase(), aw = r.away.toLowerCase();
    return (h === a && aw === b) || (h === b && aw === a);
  }).length;
  const scheduled = State.fixtures.filter(f => {
    const h = f.home.toLowerCase(), aw = f.away.toLowerCase();
    return (h === a && aw === b) || (h === b && aw === a);
  }).length;
  return played + scheduled;
}

// ── Generate fixtures ─────────────────────────────────────────
function generateFixtures(mode = 'random') {
  const date = todayYMD();
  const active = State.players.filter(p => !p.suspended);
  const ignoreList = (State.schedulerConfig.ignoreList || []).map(u => u.toLowerCase());
  const pool = active.filter(p => !ignoreList.includes(p.username.toLowerCase()));

  if (pool.length < 2) { toast('Need at least 2 active players.', 'error'); return; }

  // Warn on holiday / event
  const holiday = holidayName(date);
  const isEvent = State.mettlestateEvents.some(e => e.date === date);
  if (holiday && !confirm(`⚠ ${holiday} — Schedule fixtures anyway?`)) return;
  if (isEvent && !confirm(`⚠ Mettlestate event today — Schedule fixtures anyway?`)) return;

  const maxEncounters = State.schedulerConfig.maxEncounters || 0; // 0 = no limit

  let pairs = [];

  if (mode === 'roundrobin') {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (maxEncounters > 0 && getH2HCount(pool[i].username, pool[j].username) >= maxEncounters) continue;
        pairs.push([pool[i].username, pool[j].username]);
      }
    }
    // Shuffle round-robin pairs
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
  } else if (mode === 'maxencounters') {
    // Everyone must play everyone else up to maxEncounters times (configurable)
    // Build a list of all valid pairs that still need more meetings
    const needed = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const cap = maxEncounters > 0 ? maxEncounters : 3;
        const h2h = getH2HCount(pool[i].username, pool[j].username);
        if (h2h < cap) {
          needed.push([pool[i].username, pool[j].username]);
        }
      }
    }

    if (!needed.length) {
      toast(`All players have already met ${maxEncounters > 0 ? maxEncounters : 3} times. Reset or increase the cap.`, 'info');
      return;
    }

    // Shuffle the needed list for randomness, then schedule one round of pairings
    // using a greedy approach so each player appears at most once per generation
    for (let i = needed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [needed[i], needed[j]] = [needed[j], needed[i]];
    }

    const usedThisRound = new Set();
    for (const [a, b] of needed) {
      if (!usedThisRound.has(a) && !usedThisRound.has(b)) {
        pairs.push([a, b]);
        usedThisRound.add(a);
        usedThisRound.add(b);
      }
    }

    if (!pairs.length) {
      toast('Could not build pairs — everyone already has a pending fixture.', 'info');
      return;
    }
  } else if (mode === 'cooldown') {
    // Random pairings but skip pairs who versed each other within the last N matchdays
    const cooldownDays = State.schedulerConfig.cooldownDays || 3;
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // First pass: pair players avoiding cooldown (each player used at most once)
    const used = new Set();
    for (let i = 0; i < shuffled.length; i++) {
      if (used.has(shuffled[i].username)) continue;
      for (let j = i + 1; j < shuffled.length; j++) {
        if (used.has(shuffled[j].username)) continue;
        const a = shuffled[i].username, b = shuffled[j].username;
        if (!isOnCooldown(a, b, cooldownDays)) {
          pairs.push([a, b]);
          used.add(a);
          used.add(b);
          break;
        }
      }
    }

    // Second pass: anyone still unpaired gets matched ignoring cooldown (fallback)
    const unpaired = shuffled.filter(p => !used.has(p.username));
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      pairs.push([unpaired[i].username, unpaired[i + 1].username]);
    }

    if (!pairs.length) {
      toast('No valid pairs — all players are on cooldown. Wait for more matchdays.', 'info');
      return;
    }
  } else {
    // Random mode — respects maxEncounters cap if set
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const a = shuffled[i].username, b = shuffled[i + 1].username;
      if (maxEncounters > 0 && getH2HCount(a, b) >= maxEncounters) continue;
      pairs.push([a, b]);
    }
  }

  const newFixtures = pairs.map(([home, away]) => ({
    id: uniqueId(),
    home, away,
    postponedBy: null,
    scheduledDate: date,
  }));

  State.fixtures.push(...newFixtures);
  saveData();
  sendDiscordWebhook({ type: 'manualGenerate', mode, count: newFixtures.length, date });
  toast(`${newFixtures.length} fixture${newFixtures.length !== 1 ? 's' : ''} generated!`, 'success');
}

function addManualFixture(home, away, date) {
  if (!home || !away) { toast('Select both players.', 'error'); return; }
  if (home === away) { toast('Players must be different.', 'error'); return; }
  if (!getPlayer(home) || !getPlayer(away)) { toast('Unknown player username.', 'error'); return; }

  const d = date || todayYMD();
  State.fixtures.push({ id: uniqueId(), home, away, postponedBy: null, scheduledDate: d });
  saveData();
  sendDiscordWebhook({ type: 'manualMatch', home, away, date: d });
  toast('Fixture added!', 'success');
}

// ── Postpone ──────────────────────────────────────────────────
function postponeMatch(fixtureId, playerUsername) {
  const fix = State.fixtures.find(f => f.id === fixtureId);
  if (!fix || fix.postponedBy) return;
  const player = getPlayer(playerUsername);
  if (!player) return;

  if ((player.postponements ?? POSTPONEMENTS_PER_SEASON) <= 0) {
    if (!confirm(`${player.name} has 0 postponements left. This will record a 3–0 forfeit. Continue?`)) return;
    recordForfeit(fixtureId, playerUsername, 'autoForfeit');
    return;
  }

  player.postponements = (player.postponements ?? POSTPONEMENTS_PER_SEASON) - 1;
  fix.postponedBy = playerUsername;
  saveData();
  sendDiscordWebhook({
    type: 'postponement',
    player: player.name,
    home: fix.home,
    away: fix.away,
    remaining: player.postponements,
  });
  toast('Match postponed.', 'info');
}

function resumeMatch(fixtureId) {
  const fix = State.fixtures.find(f => f.id === fixtureId);
  if (!fix) return;
  const by = fix.postponedBy;
  fix.postponedBy = null;
  saveData();
  sendDiscordWebhook({ type: 'matchResumed', home: fix.home, away: fix.away, by });
  toast('Match resumed.', 'success');
}

function recordForfeit(fixtureId, forfeiterUsername, type = 'forfeit') {
  const fix = State.fixtures.find(f => f.id === fixtureId);
  if (!fix) return;
  const winner = fix.home === forfeiterUsername ? fix.away : fix.home;
  const result = { winner: 3, loser: 0 };
  const homeGoals = fix.home === winner ? result.winner : result.loser;
  const awayGoals = fix.away === winner ? result.winner : result.loser;
  const outcome = fix.home === winner ? 'home' : 'away';

  const r = {
    id: uniqueId(),
    home: fix.home, away: fix.away,
    result: outcome,
    homeGoals, awayGoals,
    date: todayYMD(),
    forfeit: type === 'forfeit',
    autoForfeit: type === 'autoForfeit',
  };

  State.results.unshift(r);
  State.fixtures = State.fixtures.filter(f => f.id !== fixtureId);
  updatePlayerStats(fix.home, fix.away, homeGoals, awayGoals, outcome);

  if (type === 'autoForfeit') {
    const p = getPlayer(forfeiterUsername);
    sendDiscordWebhook({ type: 'autoForfeit', player: p?.name || forfeiterUsername, home: fix.home, away: fix.away, winner });
  }
  saveData();
}

// ── Quick resolve ─────────────────────────────────────────────
function quickResolve(fixtureId, outcome) {
  const fix = State.fixtures.find(f => f.id === fixtureId);
  if (!fix) return;

  let homeGoals, awayGoals, result;
  if (outcome === 'home')  { homeGoals = 1; awayGoals = 0; result = 'home'; }
  else if (outcome === 'away') { homeGoals = 0; awayGoals = 1; result = 'away'; }
  else { homeGoals = 0; awayGoals = 0; result = 'draw'; }

  const r = {
    id: uniqueId(),
    home: fix.home, away: fix.away,
    result, homeGoals, awayGoals,
    date: fix.scheduledDate || todayYMD(),
  };

  State.results.unshift(r);
  State.fixtures = State.fixtures.filter(f => f.id !== fixtureId);
  updatePlayerStats(fix.home, fix.away, homeGoals, awayGoals, result);
  saveData();
  sendDiscordWebhook({ type: 'result', home: fix.home, away: fix.away, homeGoals, awayGoals, result });
  toast('Result logged!', 'success');
}

// ── Render ────────────────────────────────────────────────────
function renderFixtures() {
  const container = document.getElementById('fixturesContainer');
  if (!container) return;

  const filter = (document.getElementById('fixture-filter-input')?.value || '').toLowerCase();
  const active = State.fixtures.filter(f => !f.postponedBy);
  const postponed = State.fixtures.filter(f => !!f.postponedBy);

  const filtered = (arr) => filter
    ? arr.filter(f => f.home.toLowerCase().includes(filter) || f.away.toLowerCase().includes(filter))
    : arr;

  const liveBar = document.getElementById('live-bar');
  if (liveBar) {
    const total = State.fixtures.length;
    if (total > 0) {
      liveBar.style.display = 'flex';
      document.getElementById('live-bar-text').textContent =
        `SEASON IN PROGRESS · ${total} FIXTURE${total !== 1 ? 'S' : ''} REMAINING`;
    } else {
      liveBar.style.display = 'none';
    }
  }

  const renderCard = (f, i) => {
    const hp = getPlayer(f.home);
    const ap = getPlayer(f.away);
    const date = f.scheduledDate ? `<span class="fix-date">${f.scheduledDate}</span>` : '';
    return `
      <div class="fixture-card ${f.postponedBy ? 'fix-postponed' : ''}" style="animation-delay:${i * 0.04}s">
        <div class="fix-header">${date}${f.postponedBy ? '<span class="badge-postponed">POSTPONED</span>' : ''}</div>
        <div class="fix-matchup">
          <div class="fix-player fix-home">
            <span class="fix-name">${esc(hp?.name || f.home)}</span>
            <span class="fix-username">@${esc(f.home)}</span>
          </div>
          <div class="fix-vs">VS</div>
          <div class="fix-player fix-away">
            <span class="fix-name">${esc(ap?.name || f.away)}</span>
            <span class="fix-username">@${esc(f.away)}</span>
          </div>
        </div>
        ${f.postponedBy ? `
          <div class="fix-actions">
            <button class="btn-resume" onclick="resumeMatch(${f.id})">
              <i class="fas fa-play"></i> Resume
            </button>
          </div>` : `
          <div class="fix-actions">
            <div class="quick-resolve">
              <button class="btn-qr btn-home-win" onclick="quickResolve(${f.id},'home')">Home Win</button>
              <button class="btn-qr btn-draw" onclick="quickResolve(${f.id},'draw')">Draw</button>
              <button class="btn-qr btn-away-win" onclick="quickResolve(${f.id},'away')">Away Win</button>
            </div>
            <div class="postpone-actions">
              <button class="btn-postpone" onclick="postponeMatch(${f.id},'${esc(f.home)}')">
                <i class="fas fa-pause"></i> ${esc(hp?.name || f.home)}
              </button>
              <button class="btn-postpone" onclick="postponeMatch(${f.id},'${esc(f.away)}')">
                <i class="fas fa-pause"></i> ${esc(ap?.name || f.away)}
              </button>
            </div>
          </div>`}
      </div>`;
  };

  const activeCards = filtered(active);
  const postponedCards = filtered(postponed);
  const all = [...activeCards, ...postponedCards];

  if (!all.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No fixtures${filter ? ' match your search' : ' scheduled'}</p></div>`;
    return;
  }

  container.innerHTML =
    (activeCards.length ? `<div class="fix-section-label">ACTIVE FIXTURES (${activeCards.length})</div>` + activeCards.map(renderCard).join('') : '') +
    (postponedCards.length ? `<div class="fix-section-label postponed-label">POSTPONED (${postponedCards.length})</div>` + postponedCards.map(renderCard).join('') : '');
}

function updateScoreSelect() {
  const select = document.getElementById('scoreFixtureSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Select fixture…</option>' +
    State.fixtures.filter(f => !f.postponedBy).map(f =>
      `<option value="${f.id}">${esc(f.home)} vs ${esc(f.away)}</option>`
    ).join('');
}
