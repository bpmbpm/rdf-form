// modules/parser.js
import * as N3 from 'n3';
import { info, warn, error, debug } from './logger.js';

const MODULE = 'parser.js';

/**
 * Парсит Turtle/N-Triples/N3 в RDF/JS quads.
 * @returns {{quads: any[], prefixes: Record<string,string>}}
 */
export function parseTurtle(text, baseIRI = 'http://example.org/') {
  info(MODULE, 'N3.Parser', `старт, ${text.length} байт`);
  const parser = new N3.Parser({ baseIRI });
  const quads = [];
  const prefixes = {};

  try {
    parser.parse(text, (err, quad, pref) => {
      if (err) throw err;
      if (pref) Object.assign(prefixes, pref);
      if (quad) quads.push(quad);
    });
    info(MODULE, 'N3.Parser', `OK, распарсено ${quads.length} триплетов, префиксов: ${Object.keys(prefixes).length}`);
    return { quads, prefixes };
  } catch (e) {
    // N3 бросает SyntaxError с полями line/column
    const msg = e.message + (e.line != null ? ` (строка ${e.line}, колонка ${e.column})` : '');
    error(MODULE, 'N3.Parser', msg);
    throw e;
  }
}

export function extractPrefixesFromText(text) {
  const prefixes = {};
  const re1 = /@prefix\s+([A-Za-z_][\w-]*)?:\s*<([^>]+)>\s*\./g;
  let m;
  while ((m = re1.exec(text)) !== null) prefixes[m[1] || ''] = m[2];
  const re2 = /PREFIX\s+([A-Za-z_][\w-]*)?:\s*<([^>]+)>/gi;
  while ((m = re2.exec(text)) !== null) if (!(m[1] in prefixes)) prefixes[m[1] || ''] = m[2];
  debug(MODULE, '', `извлечено ${Object.keys(prefixes).length} префиксов из текста`);
  return prefixes;
}
