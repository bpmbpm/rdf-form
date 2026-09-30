// markdown.js
// Режим "markdown": показывает исходный файл как если бы это был .md —
// строки #, ##, ... становятся заголовками, остальное — текстом/блоками кода.
// Никакого разбора RDF и никаких преобразований — pass-through + рендер.

// Pass-through: возвращает текст без изменений.
// Реальный рендер делает mdToHtml() в renderFormat().
export function toMarkdown(text) {
  return text;
}

// Мини-рендерер Markdown → HTML.
export function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '', inCode = false, inList = false, para = [];
  const flush = () => { if (para.length) { html += `<p>${para.join(' ')}</p>`; para = []; } };
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const inline = s => s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');

  for (const raw of lines) {
    if (raw.startsWith('```')) {
      flush(); closeList();
      html += inCode ? '</code></pre>' : '<pre><code>';
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html += raw.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '\n';
      continue;
    }
    if (/^######\s+/.test(raw)) { flush(); closeList(); html += `<h6>${inline(raw.slice(7))}</h6>`; continue; }
    if (/^#####\s+/.test(raw))  { flush(); closeList(); html += `<h5>${inline(raw.slice(6))}</h5>`; continue; }
    if (/^####\s+/.test(raw))   { flush(); closeList(); html += `<h4>${inline(raw.slice(5))}</h4>`; continue; }
    if (/^###\s+/.test(raw))    { flush(); closeList(); html += `<h3>${inline(raw.slice(4))}</h3>`; continue; }
    if (/^##\s+/.test(raw))     { flush(); closeList(); html += `<h2>${inline(raw.slice(3))}</h2>`; continue; }
    if (/^#\s+/.test(raw))      { flush(); closeList(); html += `<h1>${inline(raw.slice(2))}</h1>`; continue; }
    if (/^[-*]\s+/.test(raw)) {
      flush();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(raw.slice(2))}</li>`;
      continue;
    }
    if (raw.trim() === '') { flush(); closeList(); continue; }
    para.push(inline(raw));
  }
  flush(); closeList();
  return html;
}
