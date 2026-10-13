/* === COPY TO CLIPBOARD === */
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copié dans le presse-papier ✓'));
}

function showToast(msg) {
  const t = document.getElementById('toast') || createToast();
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function createToast() {
  const t = document.createElement('div');
  t.id = 'toast';
  t.className = 'toast';
  document.body.appendChild(t);
  return t;
}

/* === COPY BUTTONS === */
document.addEventListener('DOMContentLoaded', () => {
  // Copy buttons inside code blocks
  document.querySelectorAll('.code-block-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const pre = btn.closest('.code-block').querySelector('pre');
      const text = pre ? pre.innerText : '';
      copyText(text);
      btn.textContent = '✓ Copié';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = '⎘ Copier'; btn.classList.remove('copied'); }, 2000);
    });
  });

  // Inline copy on cmd blocks
  document.querySelectorAll('.tool-quick-cmd').forEach(el => {
    const btn = el.querySelector('.copy-btn');
    if (!btn) return;
    const cmd = el.querySelector('.cmd-text');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyText(cmd ? cmd.textContent : el.innerText);
    });
    el.addEventListener('click', () => copyText(cmd ? cmd.textContent : el.innerText));
  });

  // Dork items
  document.querySelectorAll('.dork-item').forEach(el => {
    el.addEventListener('click', () => copyText(el.querySelector('.dork-text').textContent.trim()));
  });

  // Category tabs
  const tabs = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.tool-card');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      cards.forEach(card => {
        card.classList.toggle('search-hidden', cat !== 'all' && card.dataset.cat !== cat);
      });
    });
  });

  // Search filter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      // Reset tab active
      if (q) {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelector('.tab-btn[data-cat="all"]')?.classList.add('active');
      }
      cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.classList.toggle('search-hidden', q.length > 0 && !text.includes(q));
      });
    });
  }

  // Nmap builder
  initNmapBuilder();
  initDorksBuilder();
  initSqlmapBuilder();
  initHarvesterBuilder();
  initQuickActions();
});

/* === QUICK ACTIONS === */
const COMPANION_URL = 'http://localhost:7373';
let companionConnected = false;

async function checkCompanion() {
  try {
    const r = await fetch(COMPANION_URL + '/status', { signal: AbortSignal.timeout(1200) });
    companionConnected = r.ok;
  } catch {
    companionConnected = false;
  }
  document.querySelectorAll('.quick-actions').forEach(panel => {
    updateCompanionUI(panel, companionConnected);
  });
}

function updateCompanionUI(panel, connected) {
  const dot = panel.querySelector('.qa-companion-dot');
  const lbl = panel.querySelector('.qa-companion-label');
  const runBtn = panel.querySelector('.qa-run-btn');
  if (dot) {
    dot.className = 'qa-companion-dot' + (connected ? ' connected' : '');
  }
  if (lbl) {
    lbl.className = 'qa-companion-label' + (connected ? ' connected' : '');
    lbl.textContent = connected ? 'Compagnon connecté — exécution disponible' : 'Compagnon non connecté — copie uniquement (lancer hub-companion.py)';
  }
  if (runBtn) runBtn.classList.toggle('visible', connected);
}

function buildCompanionUI(panel) {
  // Status bar
  const bar = document.createElement('div');
  bar.className = 'qa-companion-bar';
  bar.innerHTML = '<span class="qa-companion-dot"></span><span class="qa-companion-label">Vérification du compagnon...</span>';
  panel.insertBefore(bar, panel.querySelector('.qa-target-row'));

  // Run button in result row
  const resultRow = panel.querySelector('.qa-result-row');
  if (resultRow) {
    const runBtn = document.createElement('button');
    runBtn.className = 'qa-run-btn';
    runBtn.innerHTML = '▶ Lancer';
    resultRow.appendChild(runBtn);

    runBtn.addEventListener('click', () => {
      const cmd = panel.querySelector('.qa-result-cmd')?.textContent;
      if (cmd) runCommand(panel, cmd);
    });
  }

  // Terminal area
  const termWrap = document.createElement('div');
  termWrap.className = 'qa-terminal-wrap';
  termWrap.innerHTML = `
    <div class="qa-terminal-header">
      <span class="qa-terminal-title">▌ Terminal</span>
      <button class="qa-terminal-clear">✕ Effacer</button>
    </div>
    <div class="qa-terminal"></div>`;
  panel.appendChild(termWrap);

  termWrap.querySelector('.qa-terminal-clear').addEventListener('click', () => {
    termWrap.querySelector('.qa-terminal').innerHTML = '';
    termWrap.classList.remove('visible');
  });
}

function termPrint(term, text, cls) {
  const line = document.createElement('span');
  line.className = 'qa-terminal-line' + (cls ? ' ' + cls : '');
  line.textContent = text;
  term.appendChild(line);
  term.appendChild(document.createTextNode('\n'));
  term.scrollTop = term.scrollHeight;
}

async function runCommand(panel, cmd) {
  const termWrap = panel.querySelector('.qa-terminal-wrap');
  const term = panel.querySelector('.qa-terminal');
  const runBtn = panel.querySelector('.qa-run-btn');
  if (!term || !termWrap) return;

  termWrap.classList.add('visible');
  term.innerHTML = '';
  termPrint(term, '$ ' + cmd, 'cmd');

  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ En cours...'; }

  try {
    const resp = await fetch(COMPANION_URL + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      termPrint(term, '✗ ' + (err.error || 'Erreur'), 'err');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop();
      for (const part of parts) {
        const dataLine = part.split('\n').find(l => l.startsWith('data: '));
        if (!dataLine) continue;
        try {
          const obj = JSON.parse(dataLine.slice(6));
          if (obj.line !== undefined) termPrint(term, obj.line, '');
          if (obj.info)  termPrint(term, obj.info, 'info');
          if (obj.error) termPrint(term, '✗ ' + obj.error, 'err');
          if (obj.done)  termPrint(term, `\n[Terminé — code ${obj.code}]`, 'done');
        } catch {}
      }
    }
  } catch (e) {
    termPrint(term, '✗ Connexion impossible : ' + e.message, 'err');
    termPrint(term, '  → Vérifiez que hub-companion.py est lancé', 'err');
  } finally {
    if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '▶ Lancer'; }
  }
}

function initQuickActions() {
  document.querySelectorAll('.quick-actions').forEach(panel => {
    const targetInput = panel.querySelector('.qa-target-input');
    const resultRow = panel.querySelector('.qa-result-row');
    const resultCmd = panel.querySelector('.qa-result-cmd');
    const copyResultBtn = panel.querySelector('.qa-copy-result');

    function getTarget() {
      return (targetInput && targetInput.value.trim()) || targetInput?.placeholder || '<cible>';
    }

    panel.querySelectorAll('.qa-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = btn.dataset.cmd;
        if (!tpl) return;
        const target = getTarget();
        const cmd = tpl.replace(/\{TARGET\}/g, target);

        if (resultRow && resultCmd) {
          resultCmd.textContent = cmd;
          resultRow.classList.add('visible');
        }

        navigator.clipboard.writeText(cmd).then(() => {
          showToast('Commande copiée ✓');
          btn.classList.add('copied');
          const icon = btn.querySelector('.qa-btn-icon');
          if (icon) icon.textContent = '✓';
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) icon.textContent = btn.dataset.icon || '⚡';
          }, 1800);
        });
      });
    });

    if (copyResultBtn && resultCmd) {
      copyResultBtn.addEventListener('click', () => copyText(resultCmd.textContent));
    }

    buildCompanionUI(panel);
  });

  // Vérifier le compagnon au chargement et toutes les 8 secondes
  checkCompanion();
  setInterval(checkCompanion, 8000);
}

/* === NMAP BUILDER === */
function initNmapBuilder() {
  const b = document.getElementById('nmapBuilder');
  if (!b) return;
  const update = () => {
    let cmd = 'nmap';
    const target = b.querySelector('#nmap-target')?.value || '<cible>';
    const scanType = b.querySelector('#nmap-scantype')?.value || '-sS';
    const timing = b.querySelector('#nmap-timing')?.value || '';
    const ports = b.querySelector('#nmap-ports')?.value || '';
    const extra = [...b.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);

    cmd += ` ${scanType}`;
    if (timing) cmd += ` ${timing}`;
    if (ports) cmd += ` -p ${ports}`;
    extra.forEach(e => cmd += ` ${e}`);
    cmd += ` ${target}`;

    const out = document.getElementById('nmap-output');
    if (out) out.textContent = cmd;
  };
  b.querySelectorAll('input, select').forEach(el => el.addEventListener('change', update));
  b.querySelectorAll('input[type=text]').forEach(el => el.addEventListener('input', update));
  update();

  const btn = document.getElementById('nmap-copy');
  if (btn) btn.addEventListener('click', () => copyText(document.getElementById('nmap-output').textContent));
}

/* === SQLMAP BUILDER === */
function initSqlmapBuilder() {
  const b = document.getElementById('sqlmapBuilder');
  if (!b) return;
  const update = () => {
    let cmd = 'sqlmap';
    const url = b.querySelector('#sqlmap-url')?.value || 'http://target/page?id=1';
    const level = b.querySelector('#sqlmap-level')?.value || '1';
    const risk = b.querySelector('#sqlmap-risk')?.value || '1';
    const dbms = b.querySelector('#sqlmap-dbms')?.value || '';
    const extra = [...b.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);

    cmd += ` -u "${url}"`;
    if (level !== '1') cmd += ` --level=${level}`;
    if (risk !== '1') cmd += ` --risk=${risk}`;
    if (dbms) cmd += ` --dbms=${dbms}`;
    extra.forEach(e => cmd += ` ${e}`);

    const out = document.getElementById('sqlmap-output');
    if (out) out.textContent = cmd;
  };
  b.querySelectorAll('input, select').forEach(el => el.addEventListener('change', update));
  b.querySelectorAll('input[type=text]').forEach(el => el.addEventListener('input', update));
  update();
  const btn = document.getElementById('sqlmap-copy');
  if (btn) btn.addEventListener('click', () => copyText(document.getElementById('sqlmap-output').textContent));
}

/* === GOOGLE DORKS BUILDER === */
function initDorksBuilder() {
  const b = document.getElementById('dorksBuilder');
  if (!b) return;
  const update = () => {
    let parts = [];
    const site = b.querySelector('#dork-site')?.value;
    const inurl = b.querySelector('#dork-inurl')?.value;
    const intitle = b.querySelector('#dork-intitle')?.value;
    const intext = b.querySelector('#dork-intext')?.value;
    const filetype = b.querySelector('#dork-filetype')?.value;
    const ext = b.querySelector('#dork-ext')?.value;
    const exclude = b.querySelector('#dork-exclude')?.value;

    if (site) parts.push(`site:${site}`);
    if (inurl) parts.push(`inurl:${inurl}`);
    if (intitle) parts.push(`intitle:"${intitle}"`);
    if (intext) parts.push(`intext:"${intext}"`);
    if (filetype) parts.push(`filetype:${filetype}`);
    if (ext) parts.push(`ext:${ext}`);
    if (exclude) parts.push(`-"${exclude}"`);

    const out = document.getElementById('dork-output');
    if (out) out.textContent = parts.length > 0 ? parts.join(' ') : 'site:example.com';
  };
  b.querySelectorAll('input, select').forEach(el => el.addEventListener('change', update));
  b.querySelectorAll('input[type=text]').forEach(el => el.addEventListener('input', update));
  update();
  const btn = document.getElementById('dork-copy');
  if (btn) btn.addEventListener('click', () => {
    const q = encodeURIComponent(document.getElementById('dork-output').textContent);
    window.open(`https://www.google.com/search?q=${q}`, '_blank');
  });
  const cpbtn = document.getElementById('dork-copy-text');
  if (cpbtn) cpbtn.addEventListener('click', () => copyText(document.getElementById('dork-output').textContent));
}

/* === THEHARVESTER BUILDER === */
function initHarvesterBuilder() {
  const b = document.getElementById('harvesterBuilder');
  if (!b) return;
  const update = () => {
    let cmd = 'theHarvester';
    const domain = b.querySelector('#harv-domain')?.value || 'target.com';
    const source = b.querySelector('#harv-source')?.value || 'google';
    const limit = b.querySelector('#harv-limit')?.value || '100';
    const extra = [...b.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);

    cmd += ` -d ${domain} -b ${source} -l ${limit}`;
    extra.forEach(e => cmd += ` ${e}`);

    const out = document.getElementById('harvester-output');
    if (out) out.textContent = cmd;
  };
  b.querySelectorAll('input, select').forEach(el => el.addEventListener('change', update));
  b.querySelectorAll('input[type=text]').forEach(el => el.addEventListener('input', update));
  update();
  const btn = document.getElementById('harvester-copy');
  if (btn) btn.addEventListener('click', () => copyText(document.getElementById('harvester-output').textContent));
}
