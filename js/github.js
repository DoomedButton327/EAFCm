/* ================================================================
   METTLESTATE × EA FC MOBILE — github.js v6
   New data structure (conflict-safe):
     data/player-data.json          ← primary player stats (JSON)
     data/players/<username>.txt    ← human-readable per-player file
     data/games/<date>/<home>_vs_<away>_<uid8>.txt  ← one file per game
     data/index.json                ← list of all game file paths
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

  // ── Sync bar UI
  function showBar(msg) {
    const bar = document.getElementById('sync-bar');
    const msgEl = document.getElementById('sync-msg');
    const icon = document.getElementById('sync-icon');
    if (!bar) return;
    msgEl.textContent = msg || 'Syncing\u2026';
    icon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    bar.className = 'sync-bar sync-active';
    bar.classList.remove('hidden');
  }
  function hideBar(ok, msg) {
    const bar = document.getElementById('sync-bar');
    const msgEl = document.getElementById('sync-msg');
    const icon = document.getElementById('sync-icon');
    if (!bar) return;
    icon.innerHTML = ok ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    msgEl.textContent = msg || (ok ? 'Saved to GitHub' : 'Sync failed \u2014 data saved locally');
    bar.className = `sync-bar ${ok ? 'sync-ok' : 'sync-error'}`;
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => bar.classList.add('hidden'), 4500);
  }

  // ── Status dot
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

  // ── Build index.json listing all game file paths
  function buildIndex() {
    const games = State.results.map(r => ({
      path: r.uid ? gameFilePath(r.date, r.home, r.away, r.uid) : null,
      id:   r.id,
      date: r.date,
      home: r.home,
      away: r.away,
      uid:  r.uid || null,
    })).filter(g => g.path);

    return {
      version: 2,
      lastUpdated: new Date().toISOString(),
      games,
      playerCount: State.players.length,
    };
  }

  // ── Full sync
  async function flush() {
    _debounceTimer = null;
    _pendingSync = false;
    if (!GH.isConnected()) return;

    showBar('Syncing to GitHub\u2026');
    const ts = new Date().toLocaleString('en-ZA');

    try {
      // 1. Player data JSON (primary load source)
      const playerPayload = JSON.stringify({
        players: State.players,
        lastUpdated: new Date().toISOString(),
      }, null, 2);
      await enqueue(() => doCommit(playerDataPath(), playerPayload, `Players updated \u2014 ${ts}`));

      // 2. Per-player .txt files (human-readable, one per player)
      for (const p of State.players) {
        await enqueue(() => doCommit(
          playerFilePath(p.username),
          serializePlayerTxt(p),
          `Player: ${p.username} \u2014 ${ts}`,
        ));
      }

      // 3. Per-game .txt files — each has a unique uid so bulk pushes never collide
      for (const r of State.results) {
        if (!r.uid) r.uid = shortUID(); // backfill uid for old results
        const path = gameFilePath(r.date, r.home, r.away, r.uid);
        await enqueue(() => doCommit(
          path,
          serializeGameTxt(r),
          `${r.editedAt ? 'EDITED' : 'Result'}: ${r.home} vs ${r.away} ${r.homeGoals}-${r.awayGoals} \u2014 ${ts}`,
        ));
      }

      // 4. Index
      const indexPayload = JSON.stringify(buildIndex(), null, 2);
      const indexOk = await enqueue(() => doCommit(leagueIndexPath(), indexPayload, `Index updated \u2014 ${ts}`));

      hideBar(indexOk, indexOk ? 'Saved to GitHub' : 'Partial sync \u2014 check connection');
    } catch(err) {
      console.error('GH flush error:', err);
      hideBar(false);
    }
  }

  // ── Public API
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
        if (res.status === 200) return { ok: true,  msg: `Connected \u2713 (${cfg.owner}/${cfg.repo})` };
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
      showBar('Force syncing\u2026');
      await flush();
    },

    async uploadMatchImage(base64Data, filename, dateStr) {
      const imgCfg = Storage.loadImgRepo();
      const hasImgRepo = imgCfg?.owner && imgCfg?.repo && imgCfg?.token;

      // Need at least one configured repo to upload
      if (!hasImgRepo && !GH.isConnected()) return null;

      // Image repo takes priority; falls back to main repo if not set
      const imgOwner  = hasImgRepo ? imgCfg.owner              : _config.owner;
      const imgRepo   = hasImgRepo ? imgCfg.repo               : _config.repo;
      const imgBranch = hasImgRepo ? (imgCfg.branch || 'main') : _config.branch;
      const imgToken  = hasImgRepo ? imgCfg.token              : _config.token;

      // Folder structure mirrors main repo: data/games/<date>/images/<filename>
      const path    = matchImagesPath(dateStr || todayYMD()) + filename;
      const imgBase = `https://api.github.com/repos/${imgOwner}/${imgRepo}`;
      const imgHdrs = {
        'Authorization': `token ${imgToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };

      showBar('Uploading screenshot\u2026');
      try {
        // Get SHA for existing file so we can overwrite without 409
        let sha = null;
        try {
          const r = await fetch(`${imgBase}/contents/${path}?ref=${imgBranch}`, { headers: imgHdrs });
          if (r.ok) { const d = await r.json(); sha = d.sha || null; }
        } catch {}

        const body = {
          message: `Screenshot: ${filename}`,
          branch: imgBranch,
          content: base64Data,
        };
        if (sha) body.sha = sha;

        const res = await fetch(`${imgBase}/contents/${path}`, {
          method: 'PUT', headers: imgHdrs, body: JSON.stringify(body),
        });

        if (res.ok) {
          hideBar(true, 'Screenshot saved');
          return `https://raw.githubusercontent.com/${imgOwner}/${imgRepo}/${imgBranch}/${path}`;
        }
        const errText = await res.text().catch(() => res.status);
        console.error('uploadMatchImage failed:', res.status, errText);
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
      showBar('Loading from GitHub\u2026');
      try {
        // Load players JSON
        const pr = await fetch(`${apiBase()}/contents/${playerDataPath()}?ref=${_config.branch}`, { headers: headers() });
        let players = [];
        if (pr.ok) {
          const pf = await pr.json();
          const pd = JSON.parse(decodeURIComponent(escape(atob(pf.content.replace(/\n/g, '')))));
          players = pd.players || [];
          _shaCache[playerDataPath()] = pf.sha;
        }

        // Load index
        const ir = await fetch(`${apiBase()}/contents/${leagueIndexPath()}?ref=${_config.branch}`, { headers: headers() });
        if (!ir.ok) {
          hideBar(true, players.length ? 'Players loaded (no match data yet)' : 'No remote data yet');
          return players.length ? { players, fixtures: [], results: [] } : null;
        }
        const ifile = await ir.json();
        const index = JSON.parse(decodeURIComponent(escape(atob(ifile.content.replace(/\n/g, '')))));
        _shaCache[leagueIndexPath()] = ifile.sha;

        // Load each unique game file listed in the index
        const gamePaths = (index.games || []).map(g => g.path).filter(Boolean);
        const gameResults = await Promise.all(gamePaths.map(async p => {
          try {
            const r = await fetch(`${apiBase()}/contents/${p}?ref=${_config.branch}`, { headers: headers() });
            if (!r.ok) return null;
            const f = await r.json();
            const raw = decodeURIComponent(escape(atob(f.content.replace(/\n/g, ''))));
            _shaCache[p] = f.sha;
            return parseTxtGame(raw);
          } catch { return null; }
        }));

        const results = gameResults.filter(Boolean);

        hideBar(true, 'Loaded from GitHub');
        return { players, fixtures: [], results };
      } catch(err) {
        console.error('loadRemoteData error:', err);
        hideBar(false, 'Could not load remote data');
        return null;
      }
    },

    async pushPublicLeaderboard(content) {
      const cfg = Storage.loadPubRepo();
      if (!cfg?.owner || !cfg?.repo || !cfg?.token) return false;
      const path = `data/standings-${todayYMD()}.json`;
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
        if (res.status === 200) return { ok: true, msg: 'Connected \u2713' };
        if (res.status === 401) return { ok: false, msg: 'Invalid token' };
        if (res.status === 404) return { ok: false, msg: 'Repo not found' };
        return { ok: false, msg: `GitHub error ${res.status}` };
      } catch { return { ok: false, msg: 'Network error' }; }
    },
  };
})();

// ── Parse a game txt file back into a result object
function parseTxtGame(raw) {
  const lines = raw.split('\n').filter(l => l && !l.startsWith('#'));
  const obj = {};
  lines.forEach(l => {
    const eq = l.indexOf('=');
    if (eq === -1) return;
    const key = l.slice(0, eq).trim();
    const val = l.slice(eq + 1).trim();
    obj[key] = val;
  });
  if (!obj.home || !obj.away) return null;
  return {
    id:          parseInt(obj.id) || Date.now(),
    uid:         obj.uid || shortUID(),
    date:        obj.date || todayYMD(),
    home:        obj.home,
    away:        obj.away,
    homeGoals:   parseInt(obj.homeGoals) || 0,
    awayGoals:   parseInt(obj.awayGoals) || 0,
    result:      obj.result || 'draw',
    loggedAt:    obj.loggedAt || null,
    editedAt:    obj.editedAt || null,
    imageUrl:    obj.imageUrl || undefined,
    forfeit:     obj.forfeit === 'true',
    autoWin:     obj.autoWin === 'true',
    autoForfeit: obj.autoForfeit === 'true',
  };
}
