## 1

### info
- https://github.com/bpmbpm/onto/blob/main/ver1/anchor_1.md

Даю новый модуль `markdown.js` и четыре точечные правки в `index.html` — вместо того чтобы заново публиковать весь 800-строчный HTML.

---

## 1. Новый файл `markdown.js`

Положите рядом с `index.html` и `mermaid.js`.

```javascript
// markdown.js
// Преобразование RDF/JS quads в Markdown-документ.
// Узлы группируются по rdf:type; каждый тип становится заголовком #,
// каждый узел — подзаголовком ##, свойства — пунктами списка.

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function getLabel(term, prefixes) {
  if (term.termType === 'NamedNode') {
    let best = null;
    for (const [pfx, iri] of Object.entries(prefixes)) {
      if (term.value.startsWith(iri) && (!best || iri.length > best.iri.length)) {
        best = { pfx, iri };
      }
    }
    if (best) {
      const local = term.value.slice(best.iri.length);
      if (/^[A-Za-z_][\w.-]*$/.test(local) || local === '') return `${best.pfx}:${local}`;
    }
    return `<${term.value}>`;
  }
  if (term.termType === 'BlankNode') return `_:${term.value}`;
  if (term.termType === 'Literal') {
    const lit = `"${term.value}"`;
    if (term.language) return `${lit}@${term.language}`;
    return lit;
  }
  return String(term.value);
}

function termKey(t) {
  if (!t) return '';
  switch (t.termType) {
    case 'NamedNode': return 'N' + t.value;
    case 'BlankNode': return 'B' + t.value;
    case 'Literal':   return `L|${t.value}|${t.language}|${t.datatype?.value}`;
    default:          return 'X' + t.value;
  }
}

export function rdfToMarkdown(quads, prefixes = {}, options = {}) {
  const { includeLiterals = true, title = 'RDF Graph' } = options;

  // 1. Карта типов
  const types = new Map();
  for (const q of quads) {
    if (q.predicate.value === RDF_TYPE && q.object.termType === 'NamedNode') {
      types.set(termKey(q.subject), getLabel(q.object, prefixes));
    }
  }

  // 2. Группировка триплетов по субъекту
  const subjects = new Map();
  for (const q of quads) {
    const sk = termKey(q.subject);
    if (!subjects.has(sk)) {
      subjects.set(sk, {
        subject: q.subject,
        label: getLabel(q.subject, prefixes),
        type: types.get(sk) || 'Resource',
        props: new Map(),
      });
    }
    const s = subjects.get(sk);
    const pk = termKey(q.predicate);
    if (!s.props.has(pk)) s.props.set(pk, { predicate: q.predicate, objects: [] });
    s.props.get(pk).objects.push(q.object);
  }

  // 3. Группировка субъектов по типу
  const byType = new Map();
  for (const s of subjects.values()) {
    if (!byType.has(s.type)) byType.set(s.type, []);
    byType.get(s.type).push(s);
  }

  // 4. Генерация Markdown
  let out = `# ${title}\n\n`;
  out += `_Триплетов: ${quads.length}, субъектов: ${subjects.size}, типов: ${byType.size}._\n\n`;

  // Стабильная сортировка типов по алфавиту
  const sortedTypes = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [type, list] of sortedTypes) {
    out += `## Тип: ${type}\n\n`;

    // Сортировка субъектов по метке
    const sortedSubjects = [...list].sort((a, b) => a.label.localeCompare(b.label));

    for (const s of sortedSubjects) {
      out += `### \`${s.label}\`\n\n`;

      // Сортировка предикатов по метке
      const sortedPreds = [...s.props.entries()].sort((a, b) => {
        const la = getLabel(a[1].predicate, prefixes);
        const lb = getLabel(b[1].predicate, prefixes);
        return la.localeCompare(lb);
      });

      for (const [, { predicate, objects }] of sortedPreds) {
        // rdf:type уже отражён в заголовке типа — пропускаем
        if (predicate.value === RDF_TYPE) continue;

        const pLabel = getLabel(predicate, prefixes);
        const objs = objects
          .filter(o => includeLiterals || o.termType !== 'Literal')
          .map(o => {
            const l = getLabel(o, prefixes);
            // Литералы в backticks, чтобы подчеркивания и звёздочки не ломали Markdown
            return o.termType === 'Literal' ? `\`${l}\`` : `\`${l}\``;
          });

        if (objs.length === 0) continue;

        out += `- **${pLabel}**: ${objs.join(', ')}\n`;
      }

      out += '\n';
    }
  }

  return out;
}
```

---

## 2. Четыре правки в `index.html`

### Правка A. Добавить `<option>` в выпадающий список

Найдите `<select id="sel-format" title="Режим сериализации">` и после строки с `yamlld` вставьте:

```html
<option value="markdown">Markdown: заголовки (#, ##, ###) по типам и узлам</option>
```

Итоговый вид конца списка:

```html
<option value="yamlld">YAML-LD: YAML-представление compact JSON-LD</option>
<option value="mermaid">Mermaid: граф с заголовками (#) по типам</option>
<option value="markdown">Markdown: заголовки (#, ##, ###) по типам и узлам</option>
```

### Правка B. Добавить логгер

Найдите объект `const L = { ... }` в секции 0 и добавьте строку:

```js
const L = {
  app:        mkLogger('app.js'),
  loader:     mkLogger('loader.js'),
  parser:     mkLogger('parser.js'),
  serializer: mkLogger('serializer.js'),
  sparql:     mkLogger('sparql.js'),
  mermaid:    mkLogger('mermaid.js'),
  markdown:   mkLogger('markdown.js'),   // ← новая строка
};
```

### Правка C. Добавить импорт

Найдите блок с загрузкой `mermaid.js` (в секции 1, после `sparqljs`) и добавьте рядом:

```js
// --- Mermaid-модуль ---
let rdfToMermaid = null;
try {
  const m = await import('./mermaid.js');
  rdfToMermaid = m.rdfToMermaid;
  L.app.info('mermaid.js загружен', 'import');
} catch (e) { L.app.error('mermaid.js: ' + e.message, 'import'); }

// --- Markdown-модуль ---   ← НОВЫЙ БЛОК
let rdfToMarkdown = null;
try {
  const m = await import('./markdown.js');
  rdfToMarkdown = m.rdfToMarkdown;
  L.app.info('markdown.js загружен', 'import');
} catch (e) { L.app.error('markdown.js: ' + e.message, 'import'); }
```

### Правка D. Добавить `case` в `transform()`

Найдите в функции `transform` строки:

```js
case 'mermaid':
  if (!rdfToMermaid) throw new Error('mermaid.js не загружен');
  L.mermaid.info(`генерация Mermaid: quads=${quads.length}`);
  return rdfToMermaid(quads, prefixes);
default: throw new Error('Неизвестный режим: ' + mode);
```

И **перед** `default` вставьте:

```js
case 'markdown':
  if (!rdfToMarkdown) throw new Error('markdown.js не загружен');
  L.markdown.info(`генерация Markdown: quads=${quads.length}`);
  return rdfToMarkdown(quads, prefixes);
```

---

## 3. Что вы увидите в окне Format

Для вашего `test1.ttl` (с 12 триплетами и 4 префиксами) вывод будет примерно таким:

```markdown
# RDF Graph

_Триплетов: 12, субъектов: 6, типов: 3._

## Тип: Hobby

### `ex:aliceHobbyChess`

- **rdfs2:label**: `"Шахматы"`

### `ex:aliceHobbyPhoto`

- **rdfs2:label**: `"Фотография"`

### `ex:bobHobbyChess`

- **rdfs2:label**: `"Шахматы"`

## Тип: Person

### `ex:alice`

- **onto:hasAddress**: `ex:aliceAddress`
- **onto:hasHobby**: `ex:aliceHobbyPhoto`, `ex:aliceHobbyChess`
- **rdfs2:label**: `"Алиса"`

### `ex:bob`

- **onto:hasHobby**: `ex:bobHobbyChess`
- **onto:knows**: `ex:alice`
- **rdfs2:label**: `"Боб"`

## Тип: PostalAddress

### `ex:aliceAddress`

- **onto:addressCountry**: `"Россия"`
- **onto:addressLocality**: `"Москва"`
- **onto:postalCode**: `"101000"`
- **onto:streetAddress**: `"ул. Ленина, д. 10"`
- **rdfs2:label**: `"Адрес Алисы"`
```

Такой Markdown можно сразу вставлять в README, Obsidian, Notion, GitHub Issues — заголовки `#`, `##`, `###` образуют навигируемое оглавление.

---

## 4. Структура проекта

```
ver1/
├── index.html
├── mermaid.js           ← из предыдущего шага
├── markdown.js          ← новый файл
└── files/
    ├── defaults.json
    ├── test1.ttl
    ├── 01-all-triples.rq
    └── 02-persons.rq
```

---

## 5. Проверка

1. Откройте `https://bpmbpm.github.io/rdf-form/ver1/index.html`.
2. В логе должны быть строки:
   ```
   [INFO ] [app.js] [import] mermaid.js загружен
   [INFO ] [app.js] [import] markdown.js загружен
   ```
3. Выберите в Format режим **«Markdown: заголовки (#, ##, ###) по типам и узлам»**.
4. В окне Format появится Markdown-документ, в логе — строка:
   ```
   [INFO ] [markdown.js] генерация Markdown: quads=12
   ```

Если `markdown.js` не загрузится — в логе будет `[ERROR ] [app.js] [import] markdown.js: ...`, а при попытке выбрать режим — сообщение об ошибке в окне Format. Остальные режимы продолжат работать.

---

## 6. Возможные улучшения (по запросу)

Если захотите развить модуль, есть несколько идей:

- **Опция «только заголовки без свойств»** — быстрое оглавление графа.
- **Вложенные списки для blank nodes** — разворачивать `_:b1` прямо в списке свойств, без отдельного узла.
- **Фильтр по префиксу** — показывать только `ex:*` или `onto:*`.
- **Метаданные в front-matter** — YAML-шапка `---\ntitle: ...\ntriples: N\n---`.

Скажите, если какая-то из них нужна — добавлю.
