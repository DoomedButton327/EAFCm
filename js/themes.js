/* ================================================================
   METTLESTATE × EA FC MOBILE — themes.js
   10 themes · apply · persist · render swatch grid
================================================================ */

const THEMES = {
  godmode: {
    label: 'Godmode',
    accent: '#C8F135',
    vars: {
      '--acid':'#C8F135','--acid-dim':'#a3c710','--acid-soft':'rgba(200,241,53,.12)',
      '--acid-glow':'0 0 20px rgba(200,241,53,.35)','--acid-border':'rgba(200,241,53,.25)',
      '--border-acid':'rgba(200,241,53,.25)',
      '--cyan':'#C8F135','--cyan-soft':'rgba(200,241,53,.1)','--border-cyan':'rgba(200,241,53,.2)',
      '--bg':'#050a0e','--bg-1':'#0a1218','--bg-2':'#101c24','--bg-3':'#162230','--bg-4':'#1c2a3a',
      '--bg-card':'rgba(16,28,36,.75)',
      '--border':'rgba(200,241,53,.12)','--border-2':'rgba(200,241,53,.08)',
      '--text':'#f0f4f8','--text-soft':'#b0bec5','--muted':'#607d8b','--muted-2':'#455a64',
      '--theme-poster-bg':'#050a0e','--theme-poster-text':'#C8F135',
    },
  },
  cyberblue: {
    label: 'Cyber Blue',
    accent: '#00D4FF',
    vars: {
      '--acid':'#00D4FF','--acid-dim':'#00a8cc','--acid-soft':'rgba(0,212,255,.12)',
      '--acid-glow':'0 0 20px rgba(0,212,255,.35)','--acid-border':'rgba(0,212,255,.25)',
      '--border-acid':'rgba(0,212,255,.25)',
      '--cyan':'#00D4FF','--cyan-soft':'rgba(0,212,255,.1)','--border-cyan':'rgba(0,212,255,.2)',
      '--bg':'#020b14','--bg-1':'#051525','--bg-2':'#082034','--bg-3':'#0a2a44','--bg-4':'#0d3454',
      '--bg-card':'rgba(5,21,37,.75)',
      '--border':'rgba(0,212,255,.12)','--border-2':'rgba(0,212,255,.08)',
      '--text':'#e8f4ff','--text-soft':'#90caf9','--muted':'#4a90a4','--muted-2':'#2d6a7f',
      '--theme-poster-bg':'#020b14','--theme-poster-text':'#00D4FF',
    },
  },
  bloodred: {
    label: 'Blood Red',
    accent: '#FF2D55',
    vars: {
      '--acid':'#FF2D55','--acid-dim':'#cc2444','--acid-soft':'rgba(255,45,85,.12)',
      '--acid-glow':'0 0 20px rgba(255,45,85,.35)','--acid-border':'rgba(255,45,85,.25)',
      '--border-acid':'rgba(255,45,85,.25)',
      '--cyan':'#FF2D55','--cyan-soft':'rgba(255,45,85,.1)','--border-cyan':'rgba(255,45,85,.2)',
      '--bg':'#0d0205','--bg-1':'#180409','--bg-2':'#22060d','--bg-3':'#2c0810','--bg-4':'#360a13',
      '--bg-card':'rgba(24,4,9,.75)',
      '--border':'rgba(255,45,85,.12)','--border-2':'rgba(255,45,85,.08)',
      '--text':'#ffe8ec','--text-soft':'#ef9fac','--muted':'#8a3040','--muted-2':'#5c1e29',
      '--theme-poster-bg':'#0d0205','--theme-poster-text':'#FF2D55',
    },
  },
  royalpurple: {
    label: 'Royal Purple',
    accent: '#BF5AF2',
    vars: {
      '--acid':'#BF5AF2','--acid-dim':'#9c42d1','--acid-soft':'rgba(191,90,242,.12)',
      '--acid-glow':'0 0 20px rgba(191,90,242,.35)','--acid-border':'rgba(191,90,242,.25)',
      '--border-acid':'rgba(191,90,242,.25)',
      '--cyan':'#BF5AF2','--cyan-soft':'rgba(191,90,242,.1)','--border-cyan':'rgba(191,90,242,.2)',
      '--bg':'#08030f','--bg-1':'#100518','--bg-2':'#180820','--bg-3':'#200a28','--bg-4':'#280d30',
      '--bg-card':'rgba(16,5,24,.75)',
      '--border':'rgba(191,90,242,.12)','--border-2':'rgba(191,90,242,.08)',
      '--text':'#f0e8ff','--text-soft':'#ce93d8','--muted':'#7e57a2','--muted-2':'#512da8',
      '--theme-poster-bg':'#08030f','--theme-poster-text':'#BF5AF2',
    },
  },
  solarorange: {
    label: 'Solar Orange',
    accent: '#FF9500',
    vars: {
      '--acid':'#FF9500','--acid-dim':'#cc7700','--acid-soft':'rgba(255,149,0,.12)',
      '--acid-glow':'0 0 20px rgba(255,149,0,.35)','--acid-border':'rgba(255,149,0,.25)',
      '--border-acid':'rgba(255,149,0,.25)',
      '--cyan':'#FF9500','--cyan-soft':'rgba(255,149,0,.1)','--border-cyan':'rgba(255,149,0,.2)',
      '--bg':'#0d0700','--bg-1':'#180e00','--bg-2':'#221400','--bg-3':'#2c1a00','--bg-4':'#352000',
      '--bg-card':'rgba(24,14,0,.75)',
      '--border':'rgba(255,149,0,.12)','--border-2':'rgba(255,149,0,.08)',
      '--text':'#fff3e0','--text-soft':'#ffcc80','--muted':'#8a6020','--muted-2':'#5c3d00',
      '--theme-poster-bg':'#0d0700','--theme-poster-text':'#FF9500',
    },
  },
  arctic: {
    label: 'Arctic',
    accent: '#00CED1',
    vars: {
      '--acid':'#007a7d','--acid-dim':'#005f62','--acid-soft':'rgba(0,206,209,.1)',
      '--acid-glow':'0 0 16px rgba(0,206,209,.25)','--acid-border':'rgba(0,206,209,.3)',
      '--border-acid':'rgba(0,206,209,.3)',
      '--cyan':'#007a7d','--cyan-soft':'rgba(0,206,209,.08)','--border-cyan':'rgba(0,206,209,.2)',
      '--bg':'#f0f8f8','--bg-1':'#e0f0f0','--bg-2':'#d0e8e8','--bg-3':'#c0e0e0','--bg-4':'#b0d8d8',
      '--bg-card':'rgba(224,240,240,.85)',
      '--border':'rgba(0,100,100,.15)','--border-2':'rgba(0,100,100,.08)',
      '--text':'#0a2020','--text-soft':'#204040','--muted':'#507070','--muted-2':'#809090',
      '--theme-poster-bg':'#e0f0f0','--theme-poster-text':'#007a7d',
    },
  },
  matrix: {
    label: 'Matrix',
    accent: '#00FF41',
    vars: {
      '--acid':'#00FF41','--acid-dim':'#00cc34','--acid-soft':'rgba(0,255,65,.1)',
      '--acid-glow':'0 0 20px rgba(0,255,65,.4)','--acid-border':'rgba(0,255,65,.3)',
      '--border-acid':'rgba(0,255,65,.3)',
      '--cyan':'#00FF41','--cyan-soft':'rgba(0,255,65,.08)','--border-cyan':'rgba(0,255,65,.2)',
      '--bg':'#000300','--bg-1':'#010800','--bg-2':'#020d00','--bg-3':'#031100','--bg-4':'#041500',
      '--bg-card':'rgba(1,8,0,.85)',
      '--border':'rgba(0,255,65,.15)','--border-2':'rgba(0,255,65,.08)',
      '--text':'#ccffcc','--text-soft':'#80e080','--muted':'#2a7a2a','--muted-2':'#1a4a1a',
      '--theme-poster-bg':'#000300','--theme-poster-text':'#00FF41',
    },
  },
  rosegold: {
    label: 'Rose Gold',
    accent: '#FF6B9D',
    vars: {
      '--acid':'#FF6B9D','--acid-dim':'#e0527e','--acid-soft':'rgba(255,107,157,.12)',
      '--acid-glow':'0 0 20px rgba(255,107,157,.35)','--acid-border':'rgba(255,107,157,.25)',
      '--border-acid':'rgba(255,107,157,.25)',
      '--cyan':'#FF6B9D','--cyan-soft':'rgba(255,107,157,.1)','--border-cyan':'rgba(255,107,157,.2)',
      '--bg':'#0d0508','--bg-1':'#1a080e','--bg-2':'#240a14','--bg-3':'#2e0c1a','--bg-4':'#380e20',
      '--bg-card':'rgba(26,8,14,.75)',
      '--border':'rgba(255,107,157,.12)','--border-2':'rgba(255,107,157,.08)',
      '--text':'#ffe8f0','--text-soft':'#f48fb1','--muted':'#8a3050','--muted-2':'#5c1a32',
      '--theme-poster-bg':'#0d0508','--theme-poster-text':'#FF6B9D',
    },
  },
  void: {
    label: 'Void',
    accent: '#AAAAAA',
    vars: {
      '--acid':'#AAAAAA','--acid-dim':'#888','--acid-soft':'rgba(170,170,170,.1)',
      '--acid-glow':'0 0 16px rgba(170,170,170,.2)','--acid-border':'rgba(170,170,170,.2)',
      '--border-acid':'rgba(170,170,170,.2)',
      '--cyan':'#AAAAAA','--cyan-soft':'rgba(170,170,170,.08)','--border-cyan':'rgba(170,170,170,.15)',
      '--bg':'#050505','--bg-1':'#0d0d0d','--bg-2':'#141414','--bg-3':'#1a1a1a','--bg-4':'#202020',
      '--bg-card':'rgba(13,13,13,.8)',
      '--border':'rgba(255,255,255,.08)','--border-2':'rgba(255,255,255,.04)',
      '--text':'#e0e0e0','--text-soft':'#a0a0a0','--muted':'#555','--muted-2':'#333',
      '--theme-poster-bg':'#050505','--theme-poster-text':'#AAAAAA',
    },
  },
  neonyellow: {
    label: 'Neon ⚡',
    accent: '#FFFF00',
    vars: {
      '--acid':'#FFFF00','--acid-dim':'#cccc00','--acid-soft':'rgba(255,255,0,.1)',
      '--acid-glow':'0 0 24px rgba(255,255,0,.5)','--acid-border':'rgba(255,255,0,.3)',
      '--border-acid':'rgba(255,255,0,.3)',
      '--cyan':'#FFFF00','--cyan-soft':'rgba(255,255,0,.08)','--border-cyan':'rgba(255,255,0,.2)',
      '--bg':'#050500','--bg-1':'#0a0a00','--bg-2':'#100f00','--bg-3':'#151400','--bg-4':'#1a1900',
      '--bg-card':'rgba(10,10,0,.85)',
      '--border':'rgba(255,255,0,.15)','--border-2':'rgba(255,255,0,.08)',
      '--text':'#fffff0','--text-soft':'#eeee80','--muted':'#7a7a10','--muted-2':'#4a4a00',
      '--theme-poster-bg':'#050500','--theme-poster-text':'#FFFF00',
    },
  },
};

function initTheme() {
  const id = Storage.loadTheme() || 'godmode';
  applyTheme(id, false);
}

function applyTheme(id, persist = true) {
  const theme = THEMES[id] || THEMES.godmode;
  const css = Object.entries(theme.vars).map(([k, v]) => `${k}:${v}`).join(';');
  let el = document.getElementById('theme-override-style');
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-override-style';
    document.head.appendChild(el);
  }
  el.textContent = `:root{${css}}`;
  State.currentTheme = id;
  if (persist) {
    Storage.saveTheme(id);
    sendDiscordWebhook({ type: 'themeChange', theme: theme.label });
  }
  // Update active swatch
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === id);
  });
}

function renderThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(THEMES).map(([id, t]) => `
    <button class="theme-swatch ${State.currentTheme === id ? 'active' : ''}"
            data-theme="${id}"
            style="--swatch-color:${t.accent}"
            onclick="applyTheme('${id}')">
      <span class="swatch-dot"></span>
      <span class="swatch-label">${t.label}</span>
    </button>
  `).join('');
}
