// markdown.js
// Режим "markdown": показывает исходный файл как если бы это был .md —
// строки #, ##, ... становятся заголовками, остальное — текстом/блоками кода.
// Никакого разбора RDF и никаких преобразований — pass-through + рендер.
//
// Особенности:
//  - Два (или более) пробела в конце строки → жёсткий перенос (<br>).
//  - Пустая строка разделяет абзацы.
//  - Строки, начинающиеся с #, ##, ### ... → заголовки h1..h6.
//  - Блоки ``` ... ``` → <pre><code>.
//  - Списки - или * → <ul><li>.

// Pass-through: возвращает текст без изменений.
// Реальный рендер делает mdToHtml() — вызывается из renderFormat() в index.html.
export function toMarkdown(text) {
  return text;
}

// Мини-рендерер Markdown → HTML.
export function mdToHtml(md) {
  const lines = md.split('\n');
  let html = '', inCode = false, inList = false, para = [];

  // Сборка абзаца с учётом двух пробелов в конце строки.
  // Если строка заканчивается на 2+ пробела → <br>, иначе — склейка пробелом.
  const flushPara = () => {
    if (!para.length) return;
    let buf = '';
    for (let i = 0; i < para.length; i++) {
      const line = para[i];
      const isLast = i === para.length - 1;
      if (isLast) {
        buf += line;
      } else if (/ {2,}$/.test(line)) {
        buf += line.replace(/ {2,}$/, '') + '<br>';
      } else {
        buf += line + ' ';
      }
    }
    html += `<p>${buf}</p>`;
    para = [];
  };

  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

  const inline = s => s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');

  for (const raw of lines) {
    // Блок кода ``` — начало/конец
    if (raw.startsWith('```')) {
      flushPara(); closeList();
      html += inCode ? '</code></pre>' : '<pre><code>';
      inCode = !inCode;
      continue;
    }
    // Внутри блока кода — экранируем и добавляем как есть
    if (inCode) {
      html += raw.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '\n';
      continue;
    }
    // Заголовки h1..h6
    if (/^######\s+/.test(raw)) { flushPara(); closeList(); html += `<h6>${inline(raw.slice(7))}</h6>`; continue; }
    if (/^#####\s+/.test(raw))  { flushPara(); closeList(); html += `<h5>${inline(raw.slice(6))}</h5>`; continue; }
    if (/^####\s+/.test(raw))   { flushPara(); closeList(); html += `<h4>${inline(raw.slice(5))}</h4>`; continue; }
    if (/^###\s+/.test(raw))    { flushPara(); closeList(); html += `<h3>${inline(raw.slice(4))}</h3>`; continue; }
    if (/^##\s+/.test(raw))     { flushPara(); closeList(); html += `<h2>${inline(raw.slice(3))}</h2>`; continue; }
    if (/^#\s+/.test(raw))      { flushPara(); closeList(); html += `<h1>${inline(raw.slice(2))}</h1>`; continue; }
    // Пункты списка
    if (/^[-*]\s+/.test(raw)) {
      flushPara();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(raw.slice(2))}</li>`;
      continue;
    }
    // Пустая строка — конец абзаца/списка
    if (raw.trim() === '') { flushPara(); closeList(); continue; }
    // Обычная строка — в текущий абзац
    para.push(inline(raw));
  }

  flushPara(); closeList();
  return html;
}
