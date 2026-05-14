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
});

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
