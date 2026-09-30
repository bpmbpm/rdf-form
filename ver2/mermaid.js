// mermaid.js
export function rdfToMermaid(quads, prefixes = {}) {
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

  // ---------- вспомогательные ----------
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(36);
  }

  function getLabel(term) {
    if (term.termType === 'NamedNode') {
      for (const [pfx, iri] of Object.entries(prefixes)) {
        if (term.value.startsWith(iri)) {
          const local = term.value.slice(iri.length);
          if (/^[A-Za-z_][\w.-]*$/.test(local) || local === '') {
            return `${pfx}:${local}`;
          }
        }
      }
      return term.value;
    }
    if (term.termType === 'BlankNode') return `_:${term.value}`;
    if (term.termType === 'Literal') return `"${term.value}"`;
    return String(term.value);
  }

  function nodeId(term) {
    if (term.termType === 'NamedNode') return `n_${hash(term.value)}`;
    if (term.termType === 'BlankNode') return `b_${term.value}`;
    if (term.termType === 'Literal') return `l_${hash(term.value)}`;
    return `x_${hash(String(term.value))}`;
  }

  // ---------- сбор типов ----------
  const types = new Map(); // nodeId -> typeLabel
  for (const q of quads) {
    if (q.predicate.value === RDF_TYPE && q.object.termType === 'NamedNode') {
      types.set(nodeId(q.subject), getLabel(q.object));
    }
  }

  // ---------- сбор узлов и рёбер ----------
  const nodes = new Map(); // nodeId -> { id, label, type }
  const edges = [];

  for (const q of quads) {
    const sId = nodeId(q.subject);
    const oId = nodeId(q.object);

    if (!nodes.has(sId)) {
      nodes.set(sId, {
        id: sId,
        label: getLabel(q.subject),
        type: types.get(sId) || 'Resource',
      });
    }
    if (!nodes.has(oId)) {
      nodes.set(oId, {
        id: oId,
        label: getLabel(q.object),
        type: q.object.termType === 'Literal'
          ? 'Literal'
          : (types.get(oId) || 'Resource'),
      });
    }

    if (q.predicate.value === RDF_TYPE) continue; // тип уже учтён

    edges.push({
      from: sId,
      to: oId,
      label: getLabel(q.predicate),
    });
  }

  // ---------- группировка по типам ----------
  const groups = new Map();
  for (const node of nodes.values()) {
    const t = node.type;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(node);
  }

  // ---------- генерация Mermaid ----------
  let out = 'flowchart TD\n';

  for (const [type, list] of groups) {
    const safeType = type.replace(/[^A-Za-z0-9_]/g, '_');
    out += `  %% # ${type}\n`;
    out += `  subgraph ${safeType}["${type}"]\n`;
    for (const node of list) {
      const safeLabel = node.label.replace(/"/g, '\\"');
      out += `    ${node.id}["${safeLabel}"]\n`;
    }
    out += '  end\n';
  }

  for (const e of edges) {
    const safeLabel = e.label.replace(/"/g, '\\"');
    out += `  ${e.from} -->|"${safeLabel}"| ${e.to}\n`;
  }

  return out;
}
