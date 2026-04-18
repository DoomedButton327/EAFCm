/* ================================================================
   METTLESTATE × EA FC MOBILE — discord.js
   Discord webhook embeds for every league event
================================================================ */

async function sendDiscordWebhook(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('YOUR_')) return;
  try {
    const embed = buildEmbed(payload);
    if (!embed) return;
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch(e) { console.warn('Discord webhook failed:', e); }
}

function buildEmbed(p) {
  const ts = new Date().toISOString();
  switch (p.type) {
    case 'pageload':
      return { color: 0x9333ea, title: '🌐 League Dashboard Accessed', description: 'Admin dashboard loaded.', timestamp: ts };

    case 'result':
      return {
        color: 0x00d4ff,
        title: '⚽ Match Result Logged',
        fields: [
          { name: 'Home', value: p.home, inline: true },
          { name: 'Score', value: `${p.homeGoals} – ${p.awayGoals}`, inline: true },
          { name: 'Away', value: p.away, inline: true },
          { name: 'Winner', value: p.result === 'draw' ? 'Draw' : (p.result === 'home' ? p.home : p.away), inline: false },
        ],
        timestamp: ts,
      };

    case 'resultEdited':
      return {
        color: 0x8b5cf6,
        title: '✏️ Result Edited',
        fields: [
          { name: 'Match',     value: `${p.home} vs ${p.away}`, inline: false },
          { name: 'Old Score', value: p.oldScore, inline: true },
          { name: 'New Score', value: p.newScore, inline: true },
          { name: 'Winner',    value: p.result === 'draw' ? 'Draw' : (p.result === 'home' ? p.home : p.away), inline: false },
        ],
        footer: { text: 'All player stats have been fully recalculated.' },
        timestamp: ts,
      };

    case 'postponement':
      return {
        color: 0xff9500,
        title: '⏸ Match Postponed',
        fields: [
          { name: 'Player', value: p.player, inline: true },
          { name: 'Match', value: `${p.home} vs ${p.away}`, inline: true },
          { name: 'Tokens Remaining', value: `${p.remaining}/${POSTPONEMENTS_PER_SEASON}`, inline: true },
        ],
        timestamp: ts,
      };

    case 'autoForfeit':
      return {
        color: 0xff2d55,
        title: '🚫 Auto-Forfeit (0 Tokens)',
        fields: [
          { name: 'Forfeiter', value: p.player, inline: true },
          { name: 'Match', value: `${p.home} vs ${p.away}`, inline: true },
          { name: 'Result', value: `${p.winner} wins 3–0`, inline: true },
        ],
        timestamp: ts,
      };

    case 'forfeit':
      return {
        color: 0xffd60a,
        title: '🏳 Forfeit Detected (OCR)',
        fields: [
          { name: 'Forfeiter', value: p.forfeiter, inline: true },
          { name: 'Winner', value: `${p.winner} — 3–0`, inline: true },
        ],
        timestamp: ts,
      };

    case 'noshow':
      return {
        color: 0x34c759,
        title: '👻 No-Show Recorded',
        fields: [
          { name: 'Reported By', value: p.reporter, inline: true },
          { name: 'No-Show', value: p.noshow, inline: true },
          { name: 'Result', value: `${p.reporter} wins 3–0`, inline: true },
        ],
        timestamp: ts,
      };

    case 'suspension':
      return {
        color: p.suspended ? 0xff2d55 : 0x34c759,
        title: p.suspended ? '🔴 Player Suspended' : '🟢 Player Reactivated',
        description: `**${p.player}** has been ${p.suspended ? 'suspended from play' : 'reactivated'}.`,
        timestamp: ts,
      };

    case 'manualGenerate':
      return {
        color: 0xc8f135,
        title: '🔀 Fixtures Generated',
        fields: [
          { name: 'Mode', value: p.mode, inline: true },
          { name: 'Count', value: String(p.count), inline: true },
          { name: 'Date', value: p.date || todayYMD(), inline: true },
        ],
        timestamp: ts,
      };

    case 'autoGenerate':
      return {
        color: 0xc8f135,
        title: '⏰ Auto-Fixtures Generated (2 AM)',
        fields: [
          { name: 'Count', value: String(p.count), inline: true },
          { name: 'Date', value: p.date || todayYMD(), inline: true },
        ],
        timestamp: ts,
      };

    case 'autoDraw':
      return {
        color: 0xbf5af2,
        title: '🔄 Auto-Draw Completed (2 AM)',
        fields: [{ name: 'Fixtures shuffled', value: String(p.count), inline: true }],
        timestamp: ts,
      };

    case 'autoSkip':
      return {
        color: 0xff9500,
        title: '⏭ Auto-Scheduler Skipped',
        fields: [
          { name: 'Reason', value: p.reason, inline: true },
          { name: 'Date', value: p.date || todayYMD(), inline: true },
        ],
        timestamp: ts,
      };

    case 'eventSync':
      return {
        color: 0x00d4ff,
        title: '📅 Mettlestate Events Synced',
        fields: [{ name: 'Events found', value: String(p.count), inline: true }],
        timestamp: ts,
      };

    case 'playerAdded':
      return {
        color: 0x34c759,
        title: '✅ Player Added',
        fields: [
          { name: 'Name', value: p.name, inline: true },
          { name: 'Username', value: p.username, inline: true },
        ],
        timestamp: ts,
      };

    case 'playerRemoved':
      return {
        color: 0xff9500,
        title: '❌ Player Removed',
        fields: [
          { name: 'Name', value: p.name, inline: true },
          { name: 'Username', value: p.username, inline: true },
        ],
        timestamp: ts,
      };

    case 'playersImported':
      return {
        color: 0x00d4ff,
        title: '📥 Players Bulk Imported',
        fields: [
          { name: 'Imported', value: String(p.count), inline: true },
          { name: 'Total in League', value: String(p.total), inline: true },
        ],
        timestamp: ts,
      };

    case 'manualMatch':
      return {
        color: 0x00d4ff,
        title: '🗓 Manual Fixture Added',
        fields: [
          { name: 'Home', value: p.home, inline: true },
          { name: 'Away', value: p.away, inline: true },
          { name: 'Date', value: p.date || todayYMD(), inline: true },
        ],
        timestamp: ts,
      };

    case 'matchResumed':
      return {
        color: 0x34c759,
        title: '▶ Match Resumed',
        fields: [
          { name: 'Match', value: `${p.home} vs ${p.away}`, inline: true },
          { name: 'Resumed by', value: p.by || 'Admin', inline: true },
        ],
        timestamp: ts,
      };

    case 'leagueReset':
      return { color: 0xff2d55, title: '🔄 League Data Reset', description: 'All data has been cleared.', timestamp: ts };

    case 'themeChange':
      return {
        color: 0x9333ea,
        title: '🎨 Theme Changed',
        fields: [{ name: 'Theme', value: p.theme, inline: true }],
        timestamp: ts,
      };

    case 'playerRegistration':
      return {
        color: 0xc8f135,
        title: '🆕 New Player Registration',
        fields: [
          { name: 'Name', value: p.name, inline: true },
          { name: 'Username', value: p.username, inline: true },
          { name: 'Phone', value: p.phone, inline: true },
          { name: 'Note', value: p.note || '—', inline: false },
        ],
        timestamp: ts,
      };

    default:
      return null;
  }
}
