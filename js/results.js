/* ================================================================
   METTLESTATE × EA FC MOBILE — results.js v2
   Log scores · edit results · evidence · lightbox
================================================================ */

function handleMatchImagePick(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    State.pendingMatchImage = { dataUrl: ev.target.result, filename: file.name };

    // Show thumbnail preview
    let preview = document.getElementById('match-image-preview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'match-image-preview';
      preview.className = 'match-img-preview';
      const input = document.getElementById('matchImageInput');
      input?.closest('.file-input-row')?.after(preview);
    }
    preview.innerHTML = `
      <img src="${ev.target.result}" alt="Preview" class="match-img-thumb">
      <span class="match-img-filename">${esc(file.name)}</span>
      <button class="match-img-clear" onclick="clearMatchImage()" title="Remove">
        <i class="fas fa-times"></i>
      </button>`;

    const label = document.getElementById('match-file-chosen');
    if (label) label.textContent = file.name;
    toast('Screenshot ready to attach.', 'info');
  };
  reader.readAsDataURL(file);
}

function clearMatchImage() {
  State.pendingMatchImage = null;
  const fileInput = document.getElementById('matchImageInput');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('match-image-preview');
  if (preview) preview.remove();
  const label = document.getElementById('match-file-chosen');
  if (label) label.textContent = 'No file';
}

async function logScore() {
  const fixId = parseInt(document.getElementById('scoreFixtureSelect')?.value);
  const hg = parseInt(document.getElementById('homeGoals')?.value);
  const ag = parseInt(document.getElementById('awayGoals')?.value);

  if (!fixId) { toast('Select a fixture.', 'error'); return; }
  if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) { toast('Enter valid scores.', 'error'); return; }

  const fix = State.fixtures.find(f => f.id === fixId);
  if (!fix) { toast('Fixture not found.', 'error'); return; }

  const result = hg > ag ? 'home' : ag > hg ? 'away' : 'draw';
  let imageUrl = null;
  let imageDataUrl = null;

  if (State.pendingMatchImage) {
    const { dataUrl, filename } = State.pendingMatchImage;
    const ext = filename.split('.').pop() || 'jpg';
    const fname = `match_${fix.home}_vs_${fix.away}_${Date.now()}.${ext}`;
    if (GH.isConnected() || GH.isImgRepoConnected()) {
      const base64 = dataUrl.split(',')[1];
      imageUrl = await GH.uploadMatchImage(base64, fname, fix.scheduledDate || todayYMD());
    }
    // If the upload failed (offline, rate limit, etc.), keep the image
    // visible locally as a base64 data URL so evidence isn't lost, but
    // this is NEVER written to GitHub as part of results.json — it stays
    // in browser storage only. GH.syncData() retries the real upload on
    // every future sync until it succeeds, then swaps this out for the
    // proper imageUrl automatically. See retryPendingImageUploads() in github.js.
    if (!imageUrl) imageDataUrl = dataUrl;
    State.pendingMatchImage = null;
    const fileInput = document.getElementById('matchImageInput');
    if (fileInput) fileInput.value = '';
    const preview = document.getElementById('match-image-preview');
    if (preview) preview.remove();
    const label = document.getElementById('match-file-chosen');
    if (label) label.textContent = 'No file';
  }

  const r = {
    id:        uniqueId(),
    uid:       shortUID(),          // unique 8-char hex — gives each game its own GitHub file
    loggedAt:  new Date().toISOString(),
    home:      fix.home,
    away:      fix.away,
    result,
    homeGoals: hg,
    awayGoals: ag,
    date:      fix.scheduledDate || todayYMD(),
    imageUrl:  imageUrl || undefined,
    imageDataUrl: imageDataUrl || undefined,
    // If the screenshot upload failed at log time, mark this result so
    // the next sync knows to retry it. Cleared automatically once the
    // real GitHub upload succeeds (see retryPendingImageUploads()).
    needsImageUpload: (!!imageDataUrl && !imageUrl) || undefined,
    _pendingImageFilename: (!!imageDataUrl && !imageUrl) ? `match_${fix.home}_vs_${fix.away}_${Date.now()}.jpg` : undefined,
  };

  State.results.unshift(r);
  State.fixtures = State.fixtures.filter(f => f.id !== fixId);
  updatePlayerStats(fix.home, fix.away, hg, ag, result);
  saveData();

  sendDiscordWebhook({ type: 'result', home: fix.home, away: fix.away, homeGoals: hg, awayGoals: ag, result });
  toast('Result logged!', 'success');

  document.getElementById('homeGoals').value = '';
  document.getElementById('awayGoals').value = '';
  document.getElementById('scoreFixtureSelect').value = '';
}

// ── Edit Result ───────────────────────────────────────────────
let _editingResultId = null;

function openEditResult(resultId) {
  const r = State.results.find(x => x.id === resultId);
  if (!r) return;
  _editingResultId = resultId;

  document.getElementById('edit-result-home-label').textContent = r.home;
  document.getElementById('edit-result-away-label').textContent = r.away;
  document.getElementById('edit-result-date').textContent = r.date || '';
  document.getElementById('edit-home-goals').value = r.homeGoals;
  document.getElementById('edit-away-goals').value = r.awayGoals;

  document.getElementById('edit-result-modal').classList.add('modal-open');
  document.body.classList.add('modal-active');
}

function closeEditResultModal() {
  _editingResultId = null;
  document.getElementById('edit-result-modal').classList.remove('modal-open');
  document.body.classList.remove('modal-active');
}

function saveEditedResult() {
  if (!_editingResultId) return;
  const r = State.results.find(x => x.id === _editingResultId);
  if (!r) { closeEditResultModal(); return; }

  const newHG = parseInt(document.getElementById('edit-home-goals').value);
  const newAG = parseInt(document.getElementById('edit-away-goals').value);

  if (isNaN(newHG) || isNaN(newAG) || newHG < 0 || newAG < 0) {
    toast('Enter valid scores.', 'error');
    return;
  }

  const oldStr = `${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`;
  const newResult = newHG > newAG ? 'home' : newAG > newHG ? 'away' : 'draw';

  // Update the result record
  r.homeGoals = newHG;
  r.awayGoals = newAG;
  r.result    = newResult;
  r.editedAt  = new Date().toISOString();

  // Recalculate ALL player stats from scratch so nothing gets out of sync
  recalculateAllPlayerStats();
  saveData();

  const newStr = `${r.home} ${newHG}-${newAG} ${r.away}`;
  sendDiscordWebhook({
    type: 'resultEdited',
    home: r.home, away: r.away,
    homeGoals: newHG, awayGoals: newAG,
    result: newResult,
    oldScore: oldStr,
    newScore: newStr,
  });

  toast('Result updated & scores recalculated!', 'success');
  closeEditResultModal();
}

// ── Render results list ───────────────────────────────────────
function renderResults() {
  const filter = (document.getElementById('results-search-input')?.value || '').toLowerCase();
  const container = document.getElementById('resultsContainer');
  if (!container) return;

  const list = filter
    ? State.results.filter(r => r.home.toLowerCase().includes(filter) || r.away.toLowerCase().includes(filter))
    : State.results;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-futbol"></i><p>No results yet</p></div>`;
    return;
  }

  container.innerHTML = list.map((r, i) => {
    const hWin  = r.result === 'home';
    const aWin  = r.result === 'away';
    const isDraw = r.result === 'draw';
    const hBadge = hWin ? 'badge-win' : isDraw ? 'badge-draw' : 'badge-loss';
    const aBadge = aWin ? 'badge-win' : isDraw ? 'badge-draw' : 'badge-loss';
    const borderClass = hWin ? 'border-home' : aWin ? 'border-away' : 'border-draw';

    const specialBadges = [
      r.autoWin    ? '<span class="badge-special badge-autowin">AUTO-WIN</span>'       : '',
      r.forfeit    ? '<span class="badge-special badge-forfeit">FORFEIT</span>'         : '',
      r.autoForfeit? '<span class="badge-special badge-autoforfeit">AUTO-FORFEIT</span>': '',
      r.editedAt   ? '<span class="badge-special badge-edited">EDITED</span>'           : '',
    ].join('');

    const imgBtn = (r.imageUrl || r.imageDataUrl)
      ? `<button class="btn-evidence btn-view-screenshot" onclick="openLightbox(${i})" title="View screenshot">
           <i class="fas fa-camera"></i><span class="btn-evidence-label">Screenshot</span>
         </button>` : '';

    return `
      <div class="result-card ${borderClass}" style="animation-delay:${i * 0.03}s">
        <div class="result-top">
          <span class="result-date">${r.date || ''}</span>
          <div class="result-badges">${specialBadges}</div>
          <div class="result-actions">
            ${imgBtn}
            <button class="btn-evidence btn-edit-result" onclick="openEditResult(${r.id})" title="Edit result">
              <i class="fas fa-pen"></i><span class="btn-evidence-label">Edit</span>
            </button>
          </div>
        </div>
        <div class="result-matchup">
          <div class="result-side result-home">
            <span class="result-player-name">${esc(r.home)}</span>
            <span class="result-outcome-badge ${hBadge}">${hWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}</span>
          </div>
          <div class="result-score">
            <span class="score-num">${r.homeGoals}</span>
            <span class="score-sep">–</span>
            <span class="score-num">${r.awayGoals}</span>
          </div>
          <div class="result-side result-away">
            <span class="result-outcome-badge ${aBadge}">${aWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}</span>
            <span class="result-player-name">${esc(r.away)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Lightbox ──────────────────────────────────────────────────
function openLightbox(index) {
  const r = State.results[index];
  if (!r) return;
  const src = r.imageUrl || r.imageDataUrl;
  if (!src) return;
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-caption').textContent = `${r.home} vs ${r.away} — ${r.homeGoals}–${r.awayGoals}`;
  lb.classList.add('lb-open');
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('lb-open');
}

// ── Evidence grid ─────────────────────────────────────────────
function renderEvidenceGrid() {
  const grid = document.getElementById('evidence-grid');
  if (!grid) return;
  const withEvidence = State.results.filter(r => r.imageUrl || r.imageDataUrl);
  if (!withEvidence.length) {
    grid.innerHTML = '<p class="muted-text">No match evidence uploaded yet.</p>';
    return;
  }
  grid.innerHTML = withEvidence.map((r, i) => `
    <div class="evidence-thumb" onclick="openLightbox(${State.results.indexOf(r)})">
      <img src="${r.imageUrl || r.imageDataUrl}" alt="Evidence" loading="lazy">
      <div class="evidence-thumb-label">${esc(r.home)} vs ${esc(r.away)}</div>
    </div>
  `).join('');
}
