// app.js
import { log, info, warn, error, debug, clearLog } from './modules/logger.js';
import { highlightTurtle, highlightSPARQL } from './modules/highlighter.js';
import { loadFromUrl, loadFromFile } from './modules/loader.js';
import { readClipboard, writeClipboard, downloadFile } from './modules/clipboard.js';
import { parseTurtle, extractPrefixesFromText } from './modules/parser.js';
import { transform } from './modules/serializer.js';
import { loadStoreFromQuads, runQuery, formatResultTable, resultToCSV } from './modules/sparql.js';
import { showHelp, hideHelp } from './modules/help.js';

const MODULE = 'app.js';

const state = {
  originalText: '',
  originalQuads: [],
  originalPrefixes: {},
  formattedText: '',
  sparqlText: '',
  resultRows: null,
  defaults: { original: [], sparql: [] },
};

// ---------- DOM refs ----------
const $ = id => document.getElementById(id);
const el = {
  urlOriginal: $('url-original'),
  selDefaultOriginal: $('sel-default-original'),
  viewOriginal: $('view-original'),
  urlSparql: $('url-sparql'),
  selDefaultSparql: $('sel-default-sparql'),
  viewSparql: $('view-sparql'),
  viewFormat: $('view-format'),
  viewResult: $('view-result'),
  selFormat: $('sel-format'),
};

// ---------- Инициализация ----------

async function init() {
  log('info', MODULE, '', '─── init ───');

  // defaults.json
  try {
    const r = await fetch('defaults.json');
    if (r.ok) {
      state.defaults = await r.json();
      info(MODULE, 'fetch', `defaults.json: original=${state.defaults.original?.length || 0}, sparql=${state.defaults.sparql?.length || 0}`);
    } else {
      warn(MODULE, 'fetch', `defaults.json: HTTP ${r.status}`);
    }
  } catch (e) {
    warn(MODULE, 'fetch', `defaults.json не загружен: ${e.message}`);
  }

  fillDefaultSelects();
  bindEvents();

  // Загружаем исходный Turtle по умолчанию
  await loadOriginalFromUrl(el.urlOriginal.value);

  // Загружаем SPARQL по умолчанию
  await loadSparqlFromUrl(el.urlSparql.value);

  log('info', MODULE, '', '─── ready ───');
}

function fillDefaultSelects() {
  const addOpt = (sel, list, handler) => {
    list.forEach(item => {
      const o = document.createElement('option');
      o.value = typeof item === 'string' ? item : item.url;
      o.textContent = typeof item === 'string' ? item : (item.label || item.url);
      sel.appendChild(o);
    });
    sel.addEventListener('change', handler);
  };

  addOpt(el.selDefaultOriginal, state.defaults.original || [], e => {
    const v = e.target.value;
    if (v && !v.startsWith('—')) {
      el.urlOriginal.value = v;
      loadOriginalFromUrl(v);
      e.target.selectedIndex = 0;
    }
  });
  addOpt(el.selDefaultSparql, state.defaults.sparql || [], e => {
    const v = e.target.value;
    if (v && !v.startsWith('—')) {
      el.urlSparql.value = v;
      loadSparqlFromUrl(v);
      e.target.selectedIndex = 0;
    }
  });
}

// ---------- Загрузка ----------

async function loadOriginalFromUrl(url) {
  try {
    const text = await loadFromUrl(url);
    setOriginalText(text);
  } catch (e) {
    error(MODULE, '', `Не удалось загрузить: ${e.message}`);
  }
}

function setOriginalText(text) {
  state.originalText = text;
  renderOriginal();
  parseAndPrepare();
}

function renderOriginal() {
  el.viewOriginal.innerHTML = `<code class="language-turtle">${highlightTurtle(state.originalText)}</code>`;
}

function parseAndPrepare() {
  try {
    // Извлекаем префиксы (даже если есть ошибки — для подсказок)
    const prefixesFromText = extractPrefixesFromText(state.originalText);
    const { quads, prefixes } = parseTurtle(state.originalText);
    state.originalQuads = quads;
    state.originalPrefixes = { ...prefixesFromText, ...prefixes };
    info(MODULE, 'N3.Parser', `OK: ${quads.length} триплетов, префиксов: ${Object.keys(state.originalPrefixes).length}`);

    // Инициализируем SPARQL store
    loadStoreFromQuads(quads);

    // Обновляем format-окно
    applyFormat();
  } catch (e) {
    // Ошибка парсинга — очищаем quads
    state.originalQuads = [];
    state.originalPrefixes = extractPrefixesFromText(state.originalText);
    el.viewFormat.innerHTML = `<code></code>`;
    error(MODULE, 'N3.Parser', 'Парсинг не удался, format недоступен');
  }
}

async function applyFormat() {
  const mode = el.selFormat.value;
  try {
    const out = await transform(state.originalQuads, mode, state.originalPrefixes);
    state.formattedText = out;
    el.viewFormat.innerHTML = `<code class="language-turtle">${highlightTurtle(out)}</code>`;
    info(MODULE, 'serializer.js', `format OK (${out.length} байт)`);
  } catch (e) {
    error(MODULE, 'serializer.js', e.message);
    el.viewFormat.innerHTML = `<code>Ошибка: ${e.message}</code>`;
  }
}

async function loadSparqlFromUrl(url) {
  try {
    const text = await loadFromUrl(url);
    setSparqlText(text);
  } catch (e) {
    error(MODULE, '', `SPARQL: не удалось загрузить: ${e.message}`);
  }
}

function setSparqlText(text) {
  state.sparqlText = text;
  el.viewSparql.innerHTML = `<code class="language-sparql">${highlightSPARQL(text)}</code>`;
}

// ---------- SPARQL ----------

function runSparql() {
  if (!state.sparqlText.trim()) {
    warn(MODULE, '', 'SPARQL пуст');
    return;
  }
  try {
    const res = runQuery(state.sparqlText);
    state.resultRows = res;
    const table = formatResultTable(res);
    el.viewResult.innerHTML = `<code>${escapeHtml(table)}</code>`;
    info(MODULE, 'sparql.js', `result: type=${res.type}, rows=${res.rows.length}`);
  } catch (e) {
    error(MODULE, 'sparql.js', e.message);
    el.viewResult.innerHTML = `<code>Ошибка: ${escapeHtml(e.message)}</code>`;
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Events ----------

function bindEvents() {
  $('btn-help').addEventListener('click', () => showHelp());
  $('btn-help-close').addEventListener('click', hideHelp);
  $('help-modal').addEventListener('click', e => { if (e.target.id === 'help-modal') hideHelp(); });

  $('btn-load-url-original').addEventListener('click', () => loadOriginalFromUrl(el.urlOriginal.value));
  $('btn-load-file-original').addEventListener('click', () => $('file-original').click());
  $('file-original').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try { setOriginalText(await loadFromFile(f)); }
    catch (err) { error(MODULE, '', `Файл: ${err.message}`); }
  });
  $('btn-load-buffer-original').addEventListener('click', async () => {
    try { setOriginalText(await readClipboard()); }
    catch (e) { error(MODULE, '', `Буфер: ${e.message}`); }
  });
  $('btn-copy-original').addEventListener('click', () => writeClipboard(state.originalText));

  el.selFormat.addEventListener('change', applyFormat);
  $('btn-copy-format').addEventListener('click', () => writeClipboard(state.formattedText));

  $('btn-load-url-sparql').addEventListener('click', () => loadSparqlFromUrl(el.urlSparql.value));
  $('btn-load-buffer-sparql').addEventListener('click', async () => {
    try { setSparqlText(await readClipboard()); }
    catch (e) { error(MODULE, '', `Буфер: ${e.message}`); }
  });
  $('btn-copy-sparql').addEventListener('click', () => writeClipboard(state.sparqlText));
  $('btn-run-sparql').addEventListener('click', runSparql);

  $('btn-copy-result').addEventListener('click', () => {
    if (state.resultRows) writeClipboard(formatResultTable(state.resultRows));
  });
  $('btn-save-csv').addEventListener('click', () => {
    if (!state.resultRows) { warn(MODULE, '', 'Нет результата для сохранения'); return; }
    const csv = resultToCSV(state.resultRows);
    downloadFile('result.csv', csv, 'text/csv;charset=utf-8');
  });

  $('btn-clear-log').addEventListener('click', clearLog);
}

// ---------- Start ----------
init().catch(e => error(MODULE, '', `init failed: ${e.message}`));
