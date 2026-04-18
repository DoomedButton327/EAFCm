/* ================================================================
   METTLESTATE × EA FC MOBILE — ocr.js
   WhatsApp screenshot OCR via Google Gemini 2.5 Flash
================================================================ */

let _ocrResults = [];

async function runWhatsAppOCR() {
  const keyEl = document.getElementById('gemini-api-key');
  const fileEl = document.getElementById('whatsappImageInput');
  const key = keyEl?.value?.trim() || Storage.loadGeminiKey();

  if (!key) { toast('Enter your Gemini API key first.', 'error'); return; }
  if (!fileEl?.files?.[0]) { toast('Select a WhatsApp screenshot.', 'error'); return; }

  Storage.saveGeminiKey(key);
  if (keyEl) keyEl.value = key;

  const file = fileEl.files[0];
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const base64 = ev.target.result.split(',')[1];
    const mimeType = file.type || 'image/jpeg';
    await processOCRImage(base64, mimeType, key);
  };
  reader.readAsDataURL(file);
}

async function processOCRImage(base64, mimeType, apiKey) {
  const statusEl = document.getElementById('ocr-status');
  const resultsEl = document.getElementById('ocr-results-area');
  if (statusEl) statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analysing screenshot…';
  if (resultsEl) resultsEl.innerHTML = '';

  const prompt = `You are a league management assistant for an EA FC Mobile football league in South Africa.
Analyse this WhatsApp chat screenshot and extract any league events. Return ONLY valid JSON in this exact format:
{
  "events": [
    {
      "type": "postponement" | "forfeit" | "noshow" | "result",
      "home": "<username or name>",
      "away": "<username or name>",
      "homeGoals": <number or null>,
      "awayGoals": <number or null>,
      "requestedBy": "<username who requested, or null>",
      "forfeiter": "<username who forfeited, or null>",
      "noshow": "<username who no-showed, or null>",
      "notes": "<brief explanation>"
    }
  ]
}

Detection rules:
- postponement: message tags @Tyron or @Astral AND contains "postpone", "reschedule", "can't play", "cannot play"
- forfeit: contains "take the win", "take the W", "you can have the win", "I forfeit", "give you the win"
- noshow: tags @Tyron or @Astral AND contains "didn't show", "no-show", "never showed", "not here"
- result: visible scoreline on screen (e.g. "3 - 1") with player names

If no events found, return {"events": []}.
Do NOT include markdown, code fences, or any text outside the JSON.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || `Gemini error ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"events":[]}';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    _ocrResults = parsed.events || [];

    if (statusEl) statusEl.innerHTML = `<i class="fas fa-check" style="color:var(--acid)"></i> Found ${_ocrResults.length} event${_ocrResults.length !== 1 ? 's' : ''}`;
    renderOCRResults();
  } catch(err) {
    if (statusEl) statusEl.innerHTML = `<i class="fas fa-times" style="color:var(--red)"></i> Error: ${err.message}`;
    toast('OCR failed: ' + err.message, 'error');
  }
}

function renderOCRResults() {
  const el = document.getElementById('ocr-results-area');
  if (!el) return;

  if (!_ocrResults.length) {
    el.innerHTML = '<div class="muted-text">No league events detected in this screenshot.</div>';
    return;
  }

  el.innerHTML = `
    <div class="ocr-results-header">Review detected events — check which to apply:</div>
    ${_ocrResults.map((ev, i) => `
      <div class="ocr-event-card">
        <label class="ocr-check-row">
          <input type="checkbox" id="ocr-cb-${i}" checked>
          <div class="ocr-event-info">
            <span class="ocr-type-badge ocr-type-${ev.type}">${ev.type.toUpperCase()}</span>
            <span class="ocr-detail">${formatOCREvent(ev)}</span>
            ${ev.notes ? `<div class="ocr-notes">${esc(ev.notes)}</div>` : ''}
          </div>
        </label>
      </div>
    `).join('')}
    <button class="btn-primary btn-apply-ocr" onclick="applyOCREvents()">
      <i class="fas fa-check-double"></i> Apply Selected
    </button>`;
}

function formatOCREvent(ev) {
  switch(ev.type) {
    case 'postponement': return `${esc(ev.requestedBy || '?')} requests postponement · ${esc(ev.home)} vs ${esc(ev.away)}`;
    case 'forfeit':      return `${esc(ev.forfeiter || '?')} forfeits · ${esc(ev.home)} vs ${esc(ev.away)} → 3–0`;
    case 'noshow':       return `${esc(ev.noshow || '?')} no-show · ${esc(ev.home)} vs ${esc(ev.away)} → 3–0`;
    case 'result':       return `${esc(ev.home)} ${ev.homeGoals ?? '?'} – ${ev.awayGoals ?? '?'} ${esc(ev.away)}`;
    default:             return JSON.stringify(ev);
  }
}

async function applyOCREvents() {
  let applied = 0;
  for (let i = 0; i < _ocrResults.length; i++) {
    const cb = document.getElementById(`ocr-cb-${i}`);
    if (!cb?.checked) continue;
    const ev = _ocrResults[i];
    await applyOCREvent(ev);
    applied++;
  }
  saveData();
  toast(`${applied} event${applied !== 1 ? 's' : ''} applied.`, 'success');
  _ocrResults = [];
  const el = document.getElementById('ocr-results-area');
  if (el) el.innerHTML = '';
  const status = document.getElementById('ocr-status');
  if (status) status.innerHTML = '';
}

function applyOCREvent(ev) {
  // Find matching fixture by player names/usernames (fuzzy)
  const findFixture = (a, b) => State.fixtures.find(f =>
    (fuzzyMatch(f.home, a) && fuzzyMatch(f.away, b)) ||
    (fuzzyMatch(f.home, b) && fuzzyMatch(f.away, a))
  );

  switch(ev.type) {
    case 'postponement': {
      const fix = findFixture(ev.home, ev.away);
      if (!fix) { toast(`No active fixture found for ${ev.home} vs ${ev.away}`, 'error'); return; }
      const requester = ev.requestedBy || (fuzzyMatch(fix.home, ev.home) ? fix.home : fix.away);
      postponeMatch(fix.id, requester);
      break;
    }
    case 'forfeit': {
      const fix = findFixture(ev.home, ev.away);
      if (!fix) { toast(`No fixture found for ${ev.home} vs ${ev.away}`, 'error'); return; }
      const forfeiterUser = fuzzyMatch(fix.home, ev.forfeiter) ? fix.home : fix.away;
      recordForfeit(fix.id, forfeiterUser, 'forfeit');
      sendDiscordWebhook({ type: 'forfeit', forfeiter: forfeiterUser, winner: forfeiterUser === fix.home ? fix.away : fix.home });
      break;
    }
    case 'noshow': {
      const fix = findFixture(ev.home, ev.away);
      if (!fix) { toast(`No fixture found for ${ev.home} vs ${ev.away}`, 'error'); return; }
      const noshowUser = fuzzyMatch(fix.home, ev.noshow) ? fix.home : fix.away;
      recordForfeit(fix.id, noshowUser, 'forfeit');
      const reporter = noshowUser === fix.home ? fix.away : fix.home;
      sendDiscordWebhook({ type: 'noshow', noshow: noshowUser, reporter });
      break;
    }
    case 'result': {
      if (ev.homeGoals == null || ev.awayGoals == null) { toast('Could not detect score from screenshot.', 'error'); return; }
      const fix = findFixture(ev.home, ev.away);
      if (!fix) { toast(`No fixture for ${ev.home} vs ${ev.away}`, 'error'); return; }
      const hg = parseInt(ev.homeGoals);
      const ag = parseInt(ev.awayGoals);
      const result = hg > ag ? 'home' : ag > hg ? 'away' : 'draw';
      const r = { id: uniqueId(), home: fix.home, away: fix.away, result, homeGoals: hg, awayGoals: ag, date: fix.scheduledDate || todayYMD() };
      State.results.unshift(r);
      State.fixtures = State.fixtures.filter(f => f.id !== fix.id);
      updatePlayerStats(fix.home, fix.away, hg, ag, result);
      sendDiscordWebhook({ type: 'result', home: fix.home, away: fix.away, homeGoals: hg, awayGoals: ag, result });
      break;
    }
  }
}

function fuzzyMatch(a = '', b = '') {
  if (!a || !b) return false;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(a) === norm(b) || norm(a).includes(norm(b)) || norm(b).includes(norm(a));
}
