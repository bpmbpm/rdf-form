// modules/help.js
import { info, error } from './logger.js';

const MODULE = 'help.js';

// Простой markdown → HTML (без внешних зависимостей)
function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let inList = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      html += `<p>${para.join(' ')}</p>`;
      para = [];
    }
  };
  const closeList = () => {
    if (inList) { html += '</ul>'; inList = false; }
  };

  for (const raw of lines) {
    const line = raw;
    if (line.startsWith('```')) {
      flushPara(); closeList();
      html += inCode ? '</code></pre>' : '<pre><code>';
      inCode = !inCode;
      continue;
    }
    if (inCode) { html += line.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '\n'; continue; }

    if (/^###\s+/.test(line)) { flushPara(); closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
    if (/^##\s+/.test(line))  { flushPara(); closeList(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
    if (/^#\s+/.test(line))   { flushPara(); closeList(); html += `<h1>${inline(line.slice(2))}</h1>`; continue; }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
      continue;
    }
    if (line.trim() === '') { flushPara(); closeList(); continue; }
    para.push(inline(line));
  }
  flushPara(); closeList();
  return html;
}

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)#([a-zA-Z0-9_-]+)/g, (_, sp, id) => `${sp}<a id="${id}"></a>#${id}`);
}

export async function showHelp(anchor = '') {
  const modal = document.getElementById('help-modal');
  const body = document.getElementById('help-body');
  modal.classList.remove('hidden');
  try {
    info(MODULE, 'fetch', 'help.md');
    const r = await fetch('help.md');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const md = await r.text();
    body.innerHTML = mdToHtml(md);
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (e) {
    error(MODULE, 'fetch', e.message);
    body.textContent = 'Не удалось загрузить help.md: ' + e.message;
  }
}

export function hideHelp() {
  document.getElementById('help-modal').classList.add('hidden');
}
