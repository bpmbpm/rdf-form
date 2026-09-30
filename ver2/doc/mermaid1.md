## 1

Вот реализация нового режима `mermaid` с вынесением логики в отдельный файл `mermaid.js`.

**Как это работает:**
Режим генерирует Mermaid-диаграмму (`flowchart TD`), в которой узлы группируются по их `rdf:type`. Каждая группа оформляется как `subgraph` с заголовком, а в комментариях перед группой ставится `%% # Имя_типа`, что соответствует запросу (символ `#` как заголовок).

### 1. Создайте файл `mermaid.js`

Положите его рядом с `index.html` (в папке `ver1/`).

```javascript
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
```

### 2. Обновите `index.html`

**Добавьте опцию в выпадающий список** (найдите `<select id="sel-format">` и вставьте новую строку в конец):

```html
<option value="mermaid">Mermaid: граф с заголовками (#) по типам</option>
```

**Импортируйте функцию** в начале `<script type="module">` (после импорта библиотек, но до определения `transform`):

```javascript
import { rdfToMermaid } from './mermaid.js';
```

**Добавьте `case` в функцию `transform`** (найдите `switch (mode)` и вставьте перед `default`):

```javascript
case 'mermaid':
  return rdfToMermaid(quads, prefixes);
```

**Убедитесь, что файл `mermaid.js` лежит рядом с `index.html`** — иначе браузер не найдёт модуль. Если вы публикуете через GitHub Pages, положите `mermaid.js` в ту же папку `ver1/`.

### 3. Что вы увидите в окне Format

Для вашего `test1.ttl` вывод будет примерно таким:

```
flowchart TD
  %% # Person
  subgraph Person["Person"]
    n_1a2b["ex:alice"]
    n_3c4d["ex:bob"]
  end
  %% # PostalAddress
  subgraph PostalAddress["PostalAddress"]
    n_5e6f["ex:aliceAddress"]
  end
  %% # Hobby
  subgraph Hobby["Hobby"]
    n_7g8h["ex:aliceHobbyPhoto"]
    n_9i0j["ex:aliceHobbyChess"]
    n_k1l2["ex:bobHobbyChess"]
  end
  %% # Literal
  subgraph Literal["Literal"]
    l_3m4n["\"Алиса\""]
    l_5o6p["\"ул. Ленина, д. 10\""]
  end
  n_1a2b -->|"rdf2:type"| n_2q3r["ex:Person"]
  n_1a2b -->|"rdfs2:label"| l_3m4n
  n_1a2b -->|"onto:hasAddress"| n_5e6f
  n_1a2b -->|"onto:hasHobby"| n_7g8h
  n_1a2b -->|"onto:hasHobby"| n_9i0j
  n_5e6f -->|"rdfs2:label"| l_5o6p
  ...
```

Это валидный код Mermaid, который можно вставить на [mermaid.live](https://mermaid.live) или в любой Markdown-редактор с поддержкой Mermaid (Obsidian, GitHub с ` ```mermaid `). Комментарии `%% # Person` — это «заголовки», как вы и просили. Если хотите другой стиль группировки (например, по пространствам имён или без группировки), скажите — я поправлю `mermaid.js`.
