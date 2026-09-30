// modules/sparql.js
import oxigraph from 'oxigraph';
import { info, error, debug } from './logger.js';

const MODULE = 'sparql.js';

let store = null;
let storeSize = 0;

export function resetStore() {
  store = null;
  storeSize = 0;
  debug(MODULE, 'oxigraph.Store', 'store reset');
}

/**
 * Загружает Turtle в in-memory store (Oxigraph WASM).
 */
export function loadStoreFromTurtle(turtleText, baseIRI = 'http://example.org/') {
  info(MODULE, 'oxigraph.Store', `load ${turtleText.length} байт`);
  try {
    store = new oxigraph.Store();
    store.load(turtleText, {
      format: 'text/turtle',
      base_iri: baseIRI,
    });
    storeSize = turtleText.length;
    info(MODULE, 'oxigraph.Store', 'загрузка успешна');
  } catch (e) {
    error(MODULE, 'oxigraph.Store', e.message);
    throw e;
  }
}

/**
 * Загружает RDF/JS quads в store.
 */
export function loadStoreFromQuads(quads) {
  info(MODULE, 'oxigraph.Store', `load quads=${quads.length}`);
  try {
    store = new oxigraph.Store();
    store.load(quads); // oxigraph принимает RDF/JS quads
    info(MODULE, 'oxigraph.Store', 'quads загружены');
  } catch (e) {
    error(MODULE, 'oxigraph.Store', e.message);
    throw e;
  }
}

/**
 * Выполняет SPARQL-запрос.
 * Возвращает { type, headers, rows, raw }.
 *   type: 'select' | 'ask' | 'construct' | 'other'
 *   headers: []
 *   rows: [{}]
 *   raw: исходный результат от oxigraph
 */
export function runQuery(query) {
  if (!store) throw new Error('Store не инициализирован (сначала загрузите Turtle)');
  info(MODULE, 'oxigraph.Store', `query: ${query.slice(0, 80)}${query.length > 80 ? '…' : ''}`);

  let result;
  try {
    result = store.query(query);
  } catch (e) {
    error(MODULE, 'oxigraph.Store', e.message);
    throw e;
  }

  // SELECT: Array of Bindings (Map)
  if (Array.isArray(result)) {
    // Различаем SELECT (bindings) и CONSTRUCT (quads)
    if (result.length === 0) {
      // определить по тексту запроса
      if (/^\s*(select|SELECT)/m.test(query)) {
        return { type: 'select', headers: [], rows: [], raw: result };
      }
      return { type: 'construct', headers: ['subject', 'predicate', 'object'], rows: [], raw: result };
    }
    const first = result[0];
    // quads имеют termType 'Quad' или свойства subject/predicate/object
    if (first && (first.subject || first.termType === 'Quad')) {
      const rows = result.map(q => ({
        subject:   q.subject.value,
        predicate: q.predicate.value,
        object:    q.object.termType === 'Literal'
                    ? `"${q.object.value}"${q.object.language ? '@' + q.object.language : ''}`
                    : q.object.value,
      }));
      return { type: 'construct', headers: ['subject', 'predicate', 'object'], rows, raw: result };
    }
    // SELECT bindings (Map или object)
    const headers = new Set();
    const rows = [];
    for (const b of result) {
      const row = {};
      const entries = b instanceof Map ? b.entries() : Object.entries(b);
      for (const [k, v] of entries) {
        headers.add(k);
        row[k] = v == null ? '' : (v.termType === 'Literal'
          ? v.value
          : v.value);
      }
      rows.push(row);
    }
    return { type: 'select', headers: [...headers], rows, raw: result };
  }

  // ASK: boolean
  if (typeof result === 'boolean') {
    return { type: 'ask', headers: ['result'], rows: [{ result: String(result) }], raw: result };
  }

  // CONSTRUCT: Iterable of quads
  if (result && typeof result[Symbol.iterator] === 'function') {
    const rows = [];
    for (const q of result) {
      rows.push({
        subject:   q.subject.value,
        predicate: q.predicate.value,
        object:    q.object.termType === 'Literal'
                    ? `"${q.object.value}"`
                    : q.object.value,
      });
    }
    return { type: 'construct', headers: ['subject', 'predicate', 'object'], rows, raw: result };
  }

  return { type: 'other', headers: [], rows: [], raw: result };
}

// -------- Форматирование результатов для UI --------

export function formatResultTable(res) {
  if (!res.rows.length) return '(пустой результат)';
  const widths = res.headers.map(h =>
    Math.max(h.length, ...res.rows.map(r => String(r[h] ?? '').length))
  );
  const sep = widths.map(w => '-'.repeat(w)).join('  ');
  const head = res.headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const body = res.rows.map(r =>
    res.headers.map((h, i) => String(r[h] ?? '').padEnd(widths[i])).join('  ')
  ).join('\n');
  return `${head}\n${sep}\n${body}`;
}

export function resultToCSV(res) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [res.headers.map(esc).join(',')];
  for (const r of res.rows) lines.push(res.headers.map(h => esc(r[h])).join(','));
  return lines.join('\n');
}
