// modules/highlighter.js
import { debug } from './logger.js';

const MODULE = 'highlighter.js';

const RE = {
  comment:  /#[^\n]*/y,
  ws:       /\s+/y,
  string:   /"(?:[^"\\]|\\.)*"(?:@[a-zA-Z-]+|\^\^[^\s;,.]+)?|'(?:[^'\\]|\\.)*'/y,
  iri:      /<[^>]*>/y,
  lang:     /@[a-zA-Z-]+/y,
  pname:    /[A-Za-z_][\w-]*:[A-Za-z_][\w.-]*/y,
  prefixKw: /@prefix|@base|PREFIX|BASE/y,
  keyword:  /\b(a|true|false)\b/y,
  number:   /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y,
  blank:    /_:[A-Za-z_][\w-]*/y,
  variable: /[?$][A-Za-z_][\w-]*/y,
  punct:    /[.;,()\[\]{}]/y,
  // fallback — слово или одиночный символ
  word:     /[A-Za-z_][\w-]*|./y,
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function classify(src, i) {
  RE.comment.lastIndex = i;  const m1 = RE.comment.exec(src);
  if (m1) return ['tok-comment', m1[0]];

  RE.ws.lastIndex = i;       const m2 = RE.ws.exec(src);
  if (m2) return [null, m2[0]];

  RE.string.lastIndex = i;   const m3 = RE.string.exec(src);
  if (m3) return ['tok-string', m3[0]];

  RE.iri.lastIndex = i;      const m4 = RE.iri.exec(src);
  if (m4) return ['tok-iri', m4[0]];

  RE.lang.lastIndex = i;     const m5 = RE.lang.exec(src);
  if (m5) return ['tok-lang', m5[0]];

  RE.blank.lastIndex = i;    const m6 = RE.blank.exec(src);
  if (m6) return ['tok-blank', m6[0]];

  RE.variable.lastIndex = i; const m7 = RE.variable.exec(src);
  if (m7) return ['tok-variable', m7[0]];

  RE.prefixKw.lastIndex = i; const m8 = RE.prefixKw.exec(src);
  if (m8) return ['tok-prefix', m8[0]];

  RE.pname.lastIndex = i;    const m9 = RE.pname.exec(src);
  if (m9) return ['tok-pname', m9[0]];

  RE.keyword.lastIndex = i;  const m10 = RE.keyword.exec(src);
  if (m10) return ['tok-keyword', m10[0]];

  RE.number.lastIndex = i;   const m11 = RE.number.exec(src);
  if (m11) return ['tok-number', m11[0]];

  RE.punct.lastIndex = i;    const m12 = RE.punct.exec(src);
  if (m12) return ['tok-punct', m12[0]];

  RE.word.lastIndex = i;     const m13 = RE.word.exec(src);
  if (m13) return [null, m13[0]];

  return [null, src[i]];
}

export function highlightTurtle(text) {
  debug(MODULE, '', `highlight ${text.length} bytes`);
  let out = '';
  let i = 0;
  while (i < text.length) {
    const [cls, token] = classify(text, i);
    if (!token) { out += esc(text[i]); i++; continue; }
    out += cls ? `<span class="${cls}">${esc(token)}</span>` : esc(token);
    i += token.length;
  }
  return out;
}

export function highlightSPARQL(text) {
  // та же токенизация подходит и для SPARQL (переменные, IRIs, строки, комментарии)
  return highlightTurtle(text);
}
