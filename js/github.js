/* ================================================================
   METTLESTATE × EA FC MOBILE — github.js v7
   Data structure v3:
     data/players.json              ← all player stats (JSON array)
     data/games/<date>/matches.json ← all matches for that day
     data/index.json                ← list of dates with games
     data/games/<date>/images/      ← match screenshots
================================================================ */

const GH = (() => {
  let _config = null;
  let _queue = [];
  let _running = false;
  let _shaCache = {};
  let _debounceTimer = null;
  let _hideTimer = null;
  let _pendingSync = false;

  function apiBase() {
    return `https://api.github.com/repos/${_config.owner}/${_config.repo}`;
  }
  function headers() {
    return {
      'Authorization': `token ${_config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function getFileSHA(path) {
    if (_shaCache[path] !== undefined) return _shaCache[path];
    try {
      const res = await fetch(`${apiBase()}/contents/${path}?ref=${_config.branch}`, { headers: headers() });
      if (res.status === 404) { _shaCache[path] = null; return null; }
      if (!res.ok) return null;
      const data = await res.json();
      _shaCache[path] = data.sha || null;
      return _shaCache[path];
    } catch { return null; }
  }

  function enqueue(job) {
    return new Promise((resolve, reject) => {
      _queue.push({ job, resolve, reject });
      drainQueue();
    });
  }
  async function drainQueue() {
    if (_running) return;
    if (!_queue.length) return;
    _running = true;
    while (_queue.length > 0) {
      const item = _queue.shift();
      try { item.resolve(await item.job()); } catch(err) { item.reject(err); }
    }
    _running = false;
  }

  async function doCommit(path, content, msg, isBinary, attempt = 1) {
    const sha = await getFileSHA(path);
    const body = {
      message: msg,
      branch: _config.branch,
      content: isBinary ? content : btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;
    const res = await fetch(`${apiBase()}/contents/${path}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    });
    if (res.ok) {
      try { const rd = await res.json(); if (rd?.content?.sha) _shaCache[path] = rd.content.sha; } catch {}
      return true;
    }
    if (res.status === 409 && attempt < 3) {
      delete _shaCache[path];
      await sleep(400 * attempt);
      return doCommit(path, content, msg, isBinary, attempt + 1);
    }
    return false;
  }

  // ── Sync bar UI ───────────────────────────────────────────
  function showBar(msg) {
    const bar = document.getElementById('sync-bar');
    const msgEl = document.getElementById('sync-msg');
    const icon = document.getElementById('sync-icon');
    if (!bar) return;
    msgEl.textContent = msg || 'Syncing…';
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 11-9-9"/><path d="M21 3v4h-4"/></svg>';
    bar.className = 'sync-bar sync-active';
    bar.classList.remove('hidden');
  }
  function hideBar(ok, msg) {
    const bar = document.getElementById('sync-bar');
    const msgEl = document.getElementById('sync-msg');
    const icon = document.getElementById('sync-icon');
    if (!bar) return;
    icon.innerHTML = ok
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    msgEl.textContent = msg || (ok ? 'Saved to GitHub' : 'Sync failed — data saved locally');
    bar.className = `sync-bar ${ok ? 'sync-ok' : 'sync-error'}`;
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => bar.classList.add('hidden'), 4500);
  }

  // ── Status dot ───────────────────────────────────────────
  function updateStatusUI() {
    const dot   = document.getElementById('gh-status-dot');
    const label = document.getElementById('gh-status-label');
    const btn   = document.getElementById('btn-force-sync');
    if (!dot) return;
    if (GH.isConnected()) {
      dot.className = 'status-dot status-connected';
      label.textContent = `${_config.owner}/${_config.repo}`;
      if (btn) btn.style.display = 'inline-flex';
      ['ghOwner','ghRepo','ghBranch','ghToken'].forEach(id => {
        const el = document.getElementById(id);
        const key = id.replace('gh', '').toLowerCase();
        if (el && _config[key]) el.value = _config[key];
      });
    } else {
      dot.className = 'status-dot status-local';
      label.textContent = 'Local only';
      if (btn) btn.style.display = 'none';
    }
  }

  // ── Build index.json with list of dates ──────────────────
  function buildIndex() {
    // Group results by date
    const dateMap = {};
    for (const r of State.results) {
      const d = r.date || 'undefined';
      if (!dateMap[d]) dateMap[d] = 0;
      dateMap[d]++;
    }
    const dates = Object.entries(dateMap)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      version: 3,
      lastUpdated: new Date().toISOString(),
      dates,
      playerCount: State.players.length,
    };
  }

  // ── Full sync ─────────────────────────────────────────────
  async function flush() {
    _debounceTimer = null;
    _pendingSync = false;
    if (!GH.isConnected()) return;

    showBar('Syncing to GitHub…');
    const ts = new Date().toLocaleString('en-ZA');

    try {
      // 1. players.json — single file with all player objects
      const playersPayload = JSON.stringify(State.players, null, 2);
      await enqueue(() => doCommit(
        playersJsonPath(),
        playersPayload,
        `Players updated — ${ts}`,
      ));

      // 2. fixtures.json — all current pending fixtures
      const fixturesPayload = JSON.stringify(State.fixtures, null, 2);
      await enqueue(() => doCommit(
        fixturesJsonPath(),
        fixturesPayload,
        `Fixtures updated — ${ts}`,
      ));

      // 2. Group results by date → one matches.json per day
      const byDate = {};
      for (const r of State.results) {
        const d = r.date || 'undefined';
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r);
      }
      for (const [date, matches] of Object.entries(byDate)) {
        const path = dayMatchesPath(date);
        const payload = JSON.stringify(matches, null, 2);
        await enqueue(() => doCommit(
          path,
          payload,
          `Matches ${date} — ${ts}`,
        ));
      }

      // 3. index.json
      const indexPayload = JSON.stringify(buildIndex(), null, 2);
      const indexOk = await enqueue(() => doCommit(
        leagueIndexPath(),
        indexPayload,
        `Index updated — ${ts}`,
      ));

      hideBar(indexOk, indexOk ? 'Saved to GitHub' : 'Partial sync — check connection');
    } catch(err) {
      console.error('GH flush error:', err);
      hideBar(false);
    }
  }

  // ── Public API ────────────────────────────────────────────
  return {
    load() {
      _config = Storage.loadGHConfig();
      _shaCache = {};
      updateStatusUI();
      return !!_config;
    },
    save(owner, repo, branch, token) {
      _config = {
        owner:  owner.trim(),
        repo:   repo.trim(),
        branch: (branch || 'main').trim(),
        token:  token.trim(),
      };
      Storage.saveGHConfig(_config);
      _shaCache = {};
      updateStatusUI();
    },
    disconnect() {
      _config = null;
      _shaCache = {};
      Storage.removeGHConfig();
      updateStatusUI();
    },
    isConnected() {
      return !!(_config?.owner && _config?.repo && _config?.token);
    },
    isImgRepoConnected() {
      const cfg = Storage.loadImgRepo();
      return !!(cfg?.owner && cfg?.repo && cfg?.token);
    },
    updateStatusUI,

    async testImgRepoConnection() {
      const cfg = Storage.loadImgRepo();
      if (!cfg?.owner || !cfg?.repo || !cfg?.token) return { ok: false, msg: 'Image repo not configured' };
      try {
        const res = await fetch(
          `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`,
          { headers: { 'Authorization': `token ${cfg.token}`, 'Accept': 'application/vnd.github.v3+json' } },
        );
        if (res.status === 200) return { ok: true,  msg: `Connected ✓ (${cfg.owner}/${cfg.repo})` };
        if (res.status === 401) return { ok: false, msg: 'Invalid token' };
        if (res.status === 404) return { ok: false, msg: 'Repo not found or no access' };
        return { ok: false, msg: `GitHub error ${res.status}` };
      } catch { return { ok: false, msg: 'Network error' }; }
    },

    syncData() {
      if (!GH.isConnected()) return;
      _pendingSync = true;
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(flush, SYNC_DEBOUNCE_MS);
    },
    async syncDataNow() {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
      _pendingSync = false;
      showBar('Force syncing…');
      await flush();
    },

    async uploadMatchImage(base64Data, filename, dateStr) {
      const imgCfg = Storage.loadImgRepo();
      const hasImgRepo = imgCfg?.owner && imgCfg?.repo && imgCfg?.token;
      if (!hasImgRepo && !GH.isConnected()) return null;

      const imgOwner  = hasImgRepo ? imgCfg.owner              : _config.owner;
      const imgRepo   = hasImgRepo ? imgCfg.repo               : _config.repo;
      const imgBranch = hasImgRepo ? (imgCfg.branch || 'main') : _config.branch;
      const imgToken  = hasImgRepo ? imgCfg.token              : _config.token;

      const path    = matchImagesPath(dateStr || todayYMD()) + filename;
      const imgBase = `https://api.github.com/repos/${imgOwner}/${imgRepo}`;
      const imgHdrs = {
        'Authorization': `token ${imgToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };

      showBar('Uploading screenshot…');
      try {
        let sha = null;
        try {
          const r = await fetch(`${imgBase}/contents/${path}?ref=${imgBranch}`, { headers: imgHdrs });
          if (r.ok) { const d = await r.json(); sha = d.sha || null; }
        } catch {}

        const body = { message: `Screenshot: ${filename}`, branch: imgBranch, content: base64Data };
        if (sha) body.sha = sha;

        const res = await fetch(`${imgBase}/contents/${path}`, {
          method: 'PUT', headers: imgHdrs, body: JSON.stringify(body),
        });

        if (res.ok) {
          hideBar(true, 'Screenshot saved');
          return `https://raw.githubusercontent.com/${imgOwner}/${imgRepo}/${imgBranch}/${path}`;
        }
        hideBar(false, `Image upload failed (${res.status})`);
        return null;
      } catch(err) {
        console.error('uploadMatchImage error:', err);
        hideBar(false, 'Image upload failed');
        return null;
      }
    },

    async loadRemoteData() {
      if (!GH.isConnected()) return null;
      showBar('Loading from GitHub…');
      try {
        // 1. Load players.json (flat array)
        const pr = await fetch(`${apiBase()}/contents/${playersJsonPath()}?ref=${_config.branch}`, { headers: headers() });
        let players = [];
        if (pr.ok) {
          const pf = await pr.json();
          const decoded = JSON.parse(decodeURIComponent(escape(atob(pf.content.replace(/\n/g, '')))));
          // Support both v3 flat array and legacy {players:[...]} wrapper
          players = Array.isArray(decoded) ? decoded : (decoded.players || []);
          _shaCache[playersJsonPath()] = pf.sha;
        }

        // 2. Load fixtures.json
        let fixtures = [];
        const fr = await fetch(`${apiBase()}/contents/${fixturesJsonPath()}?ref=${_config.branch}`, { headers: headers() });
        if (fr.ok) {
          const ff = await fr.json();
          const decoded = JSON.parse(decodeURIComponent(escape(atob(ff.content.replace(/\n/g, '')))));
          fixtures = Array.isArray(decoded) ? decoded : [];
          _shaCache[fixturesJsonPath()] = ff.sha;
        }

        // 3. Load index.json
        const ir = await fetch(`${apiBase()}/contents/${leagueIndexPath()}?ref=${_config.branch}`, { headers: headers() });
        if (!ir.ok) {
          hideBar(true, players.length ? 'Players loaded (no match data yet)' : 'No remote data yet');
          return players.length ? { players, fixtures, results: [] } : null;
        }
        const ifile = await ir.json();
        const index = JSON.parse(decodeURIComponent(escape(atob(ifile.content.replace(/\n/g, '')))));
        _shaCache[leagueIndexPath()] = ifile.sha;

        // 3. Load each day's matches.json
        const dates = (index.dates || []).map(d => typeof d === 'string' ? d : d.date).filter(Boolean);
        const allMatches = await Promise.all(dates.map(async date => {
          try {
            const path = dayMatchesPath(date);
            const r = await fetch(`${apiBase()}/contents/${path}?ref=${_config.branch}`, { headers: headers() });
            if (!r.ok) return [];
            const f = await r.json();
            const raw = decodeURIComponent(escape(atob(f.content.replace(/\n/g, ''))));
            _shaCache[path] = f.sha;
            return JSON.parse(raw);
          } catch { return []; }
        }));

        const results = allMatches.flat().filter(m => m && m.home && m.away);
        hideBar(true, 'Loaded from GitHub');
        return { players, fixtures, results };
      } catch(err) {
        console.error('loadRemoteData error:', err);
        hideBar(false, 'Could not load remote data');
        return null;
      }
    },

    async pushPublicLeaderboard(content) {
      const cfg = Storage.loadPubRepo();
      if (!cfg?.owner || !cfg?.repo || !cfg?.token) return false;
      const path = `data/league-data.json`;
      const base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
      const hdrs = { 'Authorization': `token ${cfg.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
      let sha = null;
      try { const r = await fetch(`${base}/contents/${path}?ref=${cfg.branch || 'main'}`, { headers: hdrs }); if (r.ok) { const d = await r.json(); sha = d.sha || null; } } catch {}
      const body = { message: `Standings update ${todayYMD()}`, branch: cfg.branch || 'main', content: btoa(unescape(encodeURIComponent(content))) };
      if (sha) body.sha = sha;
      const res = await fetch(`${base}/contents/${path}`, { method: 'PUT', headers: hdrs, body: JSON.stringify(body) });
      return res.ok;
    },

    async testConnection() {
      if (!GH.isConnected()) return { ok: false, msg: 'Not configured' };
      try {
        const res = await fetch(apiBase(), { headers: headers() });
        if (res.status === 200) return { ok: true, msg: 'Connected ✓' };
        if (res.status === 401) return { ok: false, msg: 'Invalid token' };
        if (res.status === 404) return { ok: false, msg: 'Repo not found' };
        return { ok: false, msg: `GitHub error ${res.status}` };
      } catch { return { ok: false, msg: 'Network error' }; }
    },
  };
})();
