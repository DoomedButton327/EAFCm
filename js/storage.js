/* ================================================================
   METTLESTATE × EA FC MOBILE — storage.js
   localStorage helpers · save · load · backup/restore
================================================================ */

const Storage = (() => {
  const KEYS = {
    players:        'eafc_players',
    fixtures:       'eafc_fixtures',
    results:        'eafc_results',
    theme:          'eafc_theme',
    scheduler:      'eafc_scheduler_config',
    gemini:         'eafc_gemini_key',
    ghConfig:       'eafc_gh_config',
    pubRepo:        'eafc_pub_repo',
    imgRepo:        'eafc_img_repo',
    meEvents:       'eafc_mettlestate_events',
    meLastFetch:    'eafc_events_last_fetch',
    pending:        'eafc_pending_registrations',
    discordWebhook: 'eafc_discord_webhook',   // ← NEW: secure webhook storage
  };

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error('Storage save failed:', e); }
  }
  function load(key, fallback = null) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; }
  }
  function remove(key) { try { localStorage.removeItem(key); } catch(e) {} }

  return {
    KEYS,
    save,
    load,
    remove,

    // ── Main data ─────────────────────────────────────────────
    savePlayers(arr)  { save(KEYS.players, arr); },
    saveFixtures(arr) { save(KEYS.fixtures, arr); },
    saveResults(arr)  { save(KEYS.results, arr); },

    loadPlayers()     { return load(KEYS.players, []); },
    loadFixtures()    { return load(KEYS.fixtures, []); },
    loadResults()     { return load(KEYS.results, []); },

    saveAll() {
      this.savePlayers(State.players);
      this.saveFixtures(State.fixtures);
      this.saveResults(State.results);
    },
    loadAll() {
      State.players  = this.loadPlayers();
      State.fixtures = this.loadFixtures();
      State.results  = this.loadResults();
    },

    // ── Theme ─────────────────────────────────────────────────
    saveTheme(id)    { save(KEYS.theme, id); },
    loadTheme()      { return load(KEYS.theme, 'godmode'); },

    // ── Scheduler config ─────────────────────────────────────
    saveScheduler(cfg) { save(KEYS.scheduler, cfg); },
    loadScheduler()    { return load(KEYS.scheduler, null); },

    // ── Gemini key ────────────────────────────────────────────
    saveGeminiKey(key) { save(KEYS.gemini, key); },
    loadGeminiKey()    { return load(KEYS.gemini, null); },

    // ── GitHub config ─────────────────────────────────────────
    saveGHConfig(cfg) { save(KEYS.ghConfig, cfg); },
    loadGHConfig()    { return load(KEYS.ghConfig, null); },
    removeGHConfig()  { remove(KEYS.ghConfig); },

    // ── Public repo config ────────────────────────────────────
    savePubRepo(cfg)  { save(KEYS.pubRepo, cfg); },
    loadPubRepo()     { return load(KEYS.pubRepo, null); },

    // ── Match images repo config ──────────────────────────────
    saveImgRepo(cfg)  { save(KEYS.imgRepo, cfg); },
    loadImgRepo()     { return load(KEYS.imgRepo, null); },
    removeImgRepo()   { remove(KEYS.imgRepo); },

    // ── Discord webhook (saved securely in localStorage) ──────
    saveDiscordWebhook(url) { save(KEYS.discordWebhook, url || ''); },
    loadDiscordWebhook()    { return load(KEYS.discordWebhook, ''); },
    removeDiscordWebhook()  { remove(KEYS.discordWebhook); },

    // ── Mettlestate events cache ──────────────────────────────
    saveMEEvents(events, ts) {
      save(KEYS.meEvents, events);
      save(KEYS.meLastFetch, ts || new Date().toISOString());
    },
    loadMEEvents() { return { events: load(KEYS.meEvents, []), lastFetch: load(KEYS.meLastFetch, null) }; },

    // ── Pending registrations ─────────────────────────────────
    addPendingRegistration(reg) {
      const list = load(KEYS.pending, []);
      list.push({ ...reg, submittedAt: new Date().toISOString() });
      save(KEYS.pending, list);
    },
    loadPendingRegistrations() { return load(KEYS.pending, []); },
    clearPendingRegistrations() { remove(KEYS.pending); },

    // ── Backup / Restore ──────────────────────────────────────
    exportBackup() {
      const data = {
        players:  State.players,
        fixtures: State.fixtures,
        results:  State.results,
        exportedAt: new Date().toISOString(),
        version: 3,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mettlestate-backup-${todayYMD()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    importBackup(jsonStr) {
      const data = JSON.parse(jsonStr);
      if (!data.players) throw new Error('Invalid backup: missing players');
      State.players  = data.players  || [];
      State.fixtures = data.fixtures || [];
      State.results  = data.results  || [];
      this.saveAll();
    },
  };
})();
