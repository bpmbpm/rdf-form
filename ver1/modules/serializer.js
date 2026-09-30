// modules/serializer.js
import * as N3 from 'n3';
import jsonld from 'jsonld';
import yaml from 'js-yaml';
import { info, error, debug } from './logger.js';

const MODULE = 'serializer.js';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

// -------- helpers --------

function termKey(t) {
  if (!t) return '';
  switch (t.termType) {
    case 'NamedNode':   return 'N' + t.value;
    case 'BlankNode':   return 'B' + t.value;
    case 'Literal':     return `L|${t.value}|${t.language}|${t.datatype?.value}`;
    case 'DefaultGraph':return 'G';
    default:            return 'X' + t.value;
  }
}

function escapeLiteral(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
}

function abbreviateIRI(value, prefixes) {
  let best = null;
  for (const [pfx, iri] of Object.entries(prefixes)) {
    if (value.startsWith(iri)) {
      if (!best || iri.length > best.iri.length) best = { pfx, iri };
    }
  }
  if (best) {
    const rest = value.slice(best.iri.length);
    // допустимые PN_LOCAL (упрощённая проверка)
    if (/^[A-Za-z_][\w.-]*$/.test(rest) || rest === '') return best.pfx + ':' + rest;
  }
  return null;
}

function termToString(t, { usePrefixes, prefixes }) {
  switch (t.termType) {
    case 'NamedNode': {
      if (usePrefixes) {
        const abbr = abbreviateIRI(t.value, prefixes);
        if (abbr !== null) return abbr;
      }
      return `<${t.value}>`;
    }
    case 'BlankNode':
      return '_:' + t.value;
    case 'Literal': {
      const lit = `"${escapeLiteral(t.value)}"`;
      if (t.language) return `${lit}@${t.language}`;
      if (t.datatype && t.datatype.value !== XSD_STRING) {
        return `${lit}^^${termToString(t.datatype, { usePrefixes, prefixes })}`;
      }
      return lit;
    }
    case 'DefaultGraph':
      return '';
    default:
      return `<${t.value}>`;
  }
}

function predicateToString(p, opts) {
  if (p.termType === 'NamedNode' && p.value === RDF_TYPE) return 'a';
  return termToString(p, opts);
}

// -------- Turtle serialization (4 режима) --------

export function serializeTurtleCustom(quads, { usePrefixes, useGrouping, prefixes = {} }) {
  info(MODULE, 'custom-serializer',
       `Turtle: prefixes=${usePrefixes}, grouping=${useGrouping}, quads=${quads.length}`);

  let out = '';

  if (usePrefixes && Object.keys(prefixes).length) {
    for (const [pfx, iri] of Object.entries(prefixes)) {
      out += `@prefix ${pfx}: <${iri}> .\n`;
    }
    out += '\n';
  }

  // Группировка по субъекту
  const subjects = new Map(); // key -> { subject, predicates: Map }
  for (const q of quads) {
    const sk = termKey(q.subject);
    if (!subjects.has(sk)) subjects.set(sk, { subject: q.subject, predicates: new Map() });
    const s = subjects.get(sk);
    const pk = termKey(q.predicate);
    if (!s.predicates.has(pk)) s.predicates.set(pk, { predicate: q.predicate, objects: [] });
    s.predicates.get(pk).objects.push(q.object);
  }

  const opts = { usePrefixes, prefixes };

  for (const { subject, predicates } of subjects.values()) {
    const subjStr = termToString(subject, opts);

    if (useGrouping) {
      // subject p1 o1, o2 ; p2 o3 .
      const parts = [];
      for (const { predicate, objects } of predicates.values()) {
        const pStr = predicateToString(predicate, opts);
        const objsStr = objects.map(o => termToString(o, opts)).join(', ');
        parts.push(`${pStr} ${objsStr}`);
      }
      out += `${subjStr} ${parts.join(' ;\n    ')} .\n\n`;
    } else {
      // По одному триплету в строке
      for (const { predicate, objects } of predicates.values()) {
        const pStr = predicateToString(predicate, opts);
        for (const o of objects) {
          out += `${subjStr} ${pStr} ${termToString(o, opts)} .\n`;
        }
      }
      out += '\n';
    }
  }

  return out;
}

// -------- N3 / N-Triples через N3.Writer --------

export function serializeN3(quads, { format = 'N3', prefixes = {} } = {}) {
  info(MODULE, 'N3.Writer', `формат ${format}, quads=${quads.length}`);
  return new Promise((resolve, reject) => {
    const writer = new N3.Writer({ format, prefixes });
    writer.addQuads(quads);
    writer.end((err, result) => err ? (error(MODULE, 'N3.Writer', err.message), reject(err)) : resolve(result));
  });
}

// -------- JSON-LD --------

function quadsToNQuads(quads) {
  const writer = new N3.Writer({ format: 'N-Triples' });
  return new Promise((resolve, reject) => {
    writer.addQuads(quads);
    writer.end((err, result) => err ? reject(err) : resolve(result));
  });
}

export async function serializeJSONLD(quads, mode, context = {}) {
  info(MODULE, 'jsonld', `режим ${mode}, quads=${quads.length}`);
  try {
    const nquads = await quadsToNQuads(quads);
    const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });

    let result;
    if (mode === 'expanded')      result = doc;
    else if (mode === 'flattened')result = await jsonld.flatten(doc);
    else /* compact */            result = await jsonld.compact(doc, context);

    return JSON.stringify(result, null, 2);
  } catch (e) {
    error(MODULE, 'jsonld', e.message);
    throw e;
  }
}

export async function serializeYamlLD(quads, context = {}) {
  info(MODULE, 'js-yaml + jsonld', 'YAML-LD (via compact JSON-LD)');
  try {
    const nquads = await quadsToNQuads(quads);
    const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
    const compacted = await jsonld.compact(doc, context);
    return yaml.dump(compacted, { noRefs: true, lineWidth: 100 });
  } catch (e) {
    error(MODULE, 'js-yaml', e.message);
    throw e;
  }
}

// -------- Единая точка входа --------

export async function transform(quads, mode, prefixes = {}) {
  debug(MODULE, '', `transform mode=${mode}`);
  switch (mode) {
    case 'turtle-prefixes-compact':
      return serializeTurtleCustom(quads, { usePrefixes: true,  useGrouping: true,  prefixes });
    case 'turtle-prefixes-explicit':
      return serializeTurtleCustom(quads, { usePrefixes: true,  useGrouping: false, prefixes });
    case 'turtle-no-prefixes-compact':
      return serializeTurtleCustom(quads, { usePrefixes: false, useGrouping: true,  prefixes });
    case 'turtle-no-prefixes-explicit':
      return serializeTurtleCustom(quads, { usePrefixes: false, useGrouping: false, prefixes });
    case 'n3-prefixes-compact':
      return serializeN3(quads, { format: 'N3', prefixes });
    case 'ntriples':
      return serializeN3(quads, { format: 'N-Triples' });
    case 'jsonld-compact':
      return serializeJSONLD(quads, 'compact', prefixesToContext(prefixes));
    case 'jsonld-expanded':
      return serializeJSONLD(quads, 'expanded');
    case 'jsonld-flattened':
      return serializeJSONLD(quads, 'flattened');
    case 'yamlld':
      return serializeYamlLD(quads, prefixesToContext(prefixes));
    default:
      throw new Error(`Неизвестный режим преобразования: ${mode}`);
  }
}

function prefixesToContext(prefixes) {
  const ctx = {};
  for (const [p, iri] of Object.entries(prefixes)) {
    ctx[p === '' ? '@vocab' : p] = iri;
  }
  return ctx;
}
