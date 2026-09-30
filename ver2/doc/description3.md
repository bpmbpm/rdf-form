## 1
- https://github.com/bpmbpm/rdf-form/blob/main/ver1/doc/description2.md
- https://github.com/bpmbpm/rdf-form/blob/main/ver1/doc/desc_form2.md

# Документация режимов `markdown` и `mermaid`

Документ описывает два специальных режима окна **Format**: `markdown` и `mermaid`. Оба режима вынесены в отдельные JS-модули (`markdown.js` и `mermaid.js`) и вызываются из `index.html` через динамический `import()`.

---

## 1. Режим `markdown`

### 1.1. Назначение

Показать исходный загруженный файл (например, `files/test1.ttl` или `test1.md` с GitHub) **так, как если бы это был Markdown-документ**. Никакого парсинга RDF, никаких преобразований — просто «прогон» текста через мини-рендерер Markdown.

Это нужно, когда пользователь работает с «.md-файлами со встроенным Turtle»: он видит на GitHub отрендеренный Markdown с заголовками, и в приложении хочет видеть то же самое, а не голый текст.

### 1.2. Что делает модуль

Файл `markdown.js` экспортирует **две функции**:

| Функция | Назначение |
|---|---|
| `toMarkdown(text)` | Pass-through: возвращает входной текст **без изменений**. Нужна для унификации API: `applyFormat` в `index.html` для всех режимов получает строку. |
| `mdToHtml(md)` | Мини-рендерер Markdown → HTML. Превращает `#` в `<h1>`, `##` в `<h2>`, блоки ` ``` ` в `<pre><code>`, списки `-` в `<ul>`. |

### 1.3. Как это вызывается из `index.html`

**При выборе режима markdown в `<select>`:**

```js
async function applyFormat() {
  const mode = $('sel-format').value;   // 'markdown'
  state.formatMode = mode;

  if (mode === 'markdown') {
    // Берём сырой текст как есть. Никакого transform() с quads.
    out = toMarkdown(state.originalText);
  } else {
    // Все остальные режимы работают с RDF/JS quads
    out = await transform(state.originalQuads, mode, state.originalPrefixes);
  }

  state.formattedText = out;
  renderFormat();
}
```

Ключевой момент: в отличие от остальных режимов, `markdown` **не использует `quads`** — он работает напрямую с исходным текстом `state.originalText`. Поэтому `transform()` для него не вызывается.

**При рендеринге в окне Format:**

```js
function renderFormat() {
  if (state.formatMode === 'markdown') {
    // Вставляем HTML, а не <pre><code>
    $('view-format').innerHTML =
      `<div class="markdown-body">${mdToHtml(state.formattedText)}</div>`;
  } else {
    $('view-format').innerHTML = `<code>${highlight(state.formattedText)}</code>`;
  }
}
```

CSS-класс `.markdown-body` переключает окно из моноширинного `<pre>` в обычный HTML-поток, где `<h1>`, `<h2>`, `<p>`, `<ul>` отображаются как на GitHub.

### 1.4. Как работает `mdToHtml`

Мини-рендерер идёт построчно и накапливает абзац в массиве `para`. Ключевая деталь — **правило двух пробелов**:

```js
const flushPara = () => {
  if (!para.length) return;
  let buf = '';
  for (let i = 0; i < para.length; i++) {
    const line = para[i];
    const isLast = i === para.length - 1;
    if (isLast) {
      buf += line;
    } else if (/ {2,}$/.test(line)) {
      // Два и более пробела в конце строки → жёсткий перенос <br>
      buf += line.replace(/ {2,}$/, '') + '<br>';
    } else {
      // Обычный перенос абзаца → просто пробел
      buf += line + ' ';
    }
  }
  html += `<p>${buf}</p>`;
  para = [];
};
```

Это точно соответствует [спецификации CommonMark, раздел 6.8 (Hard line breaks)](https://spec.commonmark.org/0.30/#hard-line-breaks): «A line break (not in a code span or HTML tag) that is preceded by two or more spaces … is parsed as a hard line break».

Другие правила:

| Вход | Выход |
|---|---|
| `# Заголовок` | `<h1>Заголовок</h1>` |
| `## Заголовок` | `<h2>…</h2>` |
| `### …` до `######` | `<h3>` … `<h6>` |
| `- пункт` или `* пункт` | `<ul><li>пункт</li></ul>` |
| ` ``` … ``` ` | `<pre><code>…</code></pre>` |
| Пустая строка | Закрывает абзац/список |
| `**жирный**` | `<strong>жирный</strong>` |
| `` `код` `` | `<code>код</code>` |
| `[текст](url)` | `<a href="url">текст</a>` |
| `строка1  \nстрока2` (2 пробела) | `<p>строка1<br>строка2</p>` |

### 1.5. Какие библиотеки используются

**Никакие.** `markdown.js` — чистый JavaScript без зависимостей. Это сделано намеренно:

- Не тянем `marked`, `markdown-it` (сотни КБ) — для базового набора правил хватает 60 строк.
- Мини-рендерер работает синхронно, без загрузки WASM.

Если в будущем понадобятся таблицы, сноски, вложенные списки — можно заменить на `marked` через `import marked from 'https://cdn.jsdelivr.net/npm/marked@latest/+esm'`.

---

## 2. Режим `mermaid`

### 2.1. Назначение

Преобразовать RDF-граф (после парсинга в RDF/JS quads) в **диаграмму Mermaid** с группировкой по типам. Каждый тип — `subgraph` с заголовком в комментарии `%% # Имя_типа`.

Результат — валидный `flowchart TD`, который можно вставить на [mermaid.live](https://mermaid.live) или в любой Markdown-редактор с поддержкой Mermaid (GitHub, Obsidian, Notion).

### 2.2. Что делает модуль

Файл `mermaid.js` экспортирует одну функцию `rdfToMermaid(quads, prefixes)`:

```js
export function rdfToMermaid(quads, prefixes = {}) {
  // 1. Собираем карту типов: nodeId → метка типа
  // 2. Собираем узлы и рёбра из quads
  // 3. Группируем узлы по типам
  // 4. Генерируем flowchart TD с subgraph-блоками
  return out;
}
```

### 2.3. Как это вызывается из `index.html`

Mermaid-модуль работает **с quads**, в отличие от markdown. Поэтому используется общий `transform()`:

```js
case 'mermaid':
  if (!rdfToMermaid) throw new Error('mermaid.js не загружен');
  L.mermaid.info(`генерация Mermaid: quads=${quads.length}`);
  return rdfToMermaid(quads, prefixes);
```

И `applyFormat` вызывает его так же, как и Turtle-режимы:

```js
out = await transform(state.originalQuads, 'mermaid', state.originalPrefixes);
```

### 2.4. Как работает `rdfToMermaid`

**Шаг 1 — карта типов.** Идём по всем quads, где предикат `rdf:type`, и запоминаем, какой узел к какому типу относится:

```js
const types = new Map();
for (const q of quads) {
  if (q.predicate.value === RDF_TYPE && q.object.termType === 'NamedNode') {
    types.set(nodeId(q.subject), getLabel(q.object, prefixes));
  }
}
```

**Шаг 2 — узлы и рёбра.** Для каждого quad создаём два узла (субъект и объект) и одно ребро. Если предикат `rdf:type`, ребро не создаём — тип уже отражён в группе:

```js
if (q.predicate.value === RDF_TYPE) continue;
edges.push({ from: sId, to: oId, label: getLabel(q.predicate, prefixes) });
```

**Шаг 3 — группировка по типам.** Идём по всем узлам и раскладываем их по `Map<тип, узел[]>`.

**Шаг 4 — генерация.** Для каждого типа выводим:

```
%% # Person
subgraph T_Person["Person"]
  n_1a2b["ex:alice"]
  n_3c4d["ex:bob"]
end
```

Затем — рёбра:

```
n_1a2b -->|"rdfs2:label"| l_5e6f
```

### 2.5. Идентификаторы узлов

Mermaid требует, чтобы `nodeId` был валидным идентификатором (буквы, цифры, подчёркивания). Полные IRI содержат `/`, `#`, `:` — их нельзя использовать напрямую. Поэтому используется хеш:

```js
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);  // h * 31 + char
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function nodeId(term) {
  if (term.termType === 'NamedNode') return `n_${hash(term.value)}`;
  if (term.termType === 'BlankNode') return `b_${term.value}`;
  if (term.termType === 'Literal')   return `l_${hash(term.value)}`;
  return `x_${hash(String(term.value))}`;
}
```

Префиксы `n_`, `b_`, `l_` помогают избежать коллизий, если у IRI, blank node и литерала совпадёт хеш (маловероятно, но возможно).

### 2.6. Сокращение IRI

Для читаемости в метках используется **та же функция `abbreviateIRI`**, что и в Turtle-сериализаторе: если IRI начинается с одного из префиксов — заменяем на QName.

```js
function getLabel(term, prefixes) {
  if (term.termType === 'NamedNode') {
    // Ищем самый длинный подходящий префикс
    for (const [pfx, iri] of Object.entries(prefixes)) {
      if (term.value.startsWith(iri) && iri.length > best.iri.length) {
        best = { pfx, iri };
      }
    }
    if (best) {
      const local = term.value.slice(best.iri.length);
      if (/^[A-Za-z_][\w.-]*$/.test(local)) return `${best.pfx}:${local}`;
    }
    return term.value;  // без сокращения
  }
  if (term.termType === 'Literal') return `"${term.value}"`;
  return String(term.value);
}
```

### 2.7. Экранирование в Mermaid

В Mermaid кавычки `"` в подписях узлов и рёбер нужно экранировать:

```js
const safeLabel = node.label.replace(/"/g, '\\"');
out += `    ${node.id}["${safeLabel}"]\n`;
```

В остальном Mermaid-синтаксис гибок: `[ ]`, `{ }`, `( )` — все валидны для подписей, если внутри нет незакрытых кавычек.

### 2.8. Какие библиотеки используются

**Никакие.** `mermaid.js` — чистый JavaScript.

Парадокс: для **генерации** Mermaid-кода библиотека Mermaid не нужна — это текстовый формат. Библиотека `mermaid` (npm-пакет) нужна, чтобы **отрендерить** диаграмму в SVG — но мы этого не делаем, а отдаём пользователю текст, который он вставит в `mermaid.live` или GitHub. Это соответствует принципу «одна задача — одна библиотека».

Если бы мы захотели **встроенный просмотр** (не текст, а картинка), пришлось бы подключить:

```html
<script type="importmap">
{
  "imports": {
    "mermaid": "https://cdn.jsdelivr.net/npm/mermaid@latest/+esm"
  }
}
</script>
```

И вызвать `mermaid.render('id', text)`. Но это тяжёлая библиотека (~2 МБ), и в нашем случае она не нужна.

---

## 3. Как обе библиотеки интегрированы в `index.html`

### 3.1. Динамический импорт

Оба модуля подгружаются через `await import()` в блоке инициализации:

```js
// --- Mermaid-модуль ---
let rdfToMermaid = null;
try {
  const m = await import('./mermaid.js');
  rdfToMermaid = m.rdfToMermaid;
  L.app.info('mermaid.js загружен', 'import');
} catch (e) { L.app.error('mermaid.js: ' + e.message, 'import'); }

// --- Markdown-модуль ---
let toMarkdown = null;
let mdToHtml = null;
try {
  const m = await import('./markdown.js');
  toMarkdown = m.toMarkdown;
  mdToHtml   = m.mdToHtml;
  L.app.info('markdown.js загружен', 'import');
} catch (e) { L.app.error('markdown.js: ' + e.message, 'import'); }
```

**Почему динамический, а не статический import:**

- Если один из файлов не загрузился (404, опечатка в имени, отсутствует), **приложение продолжает работать** — просто соответствующий режим вернёт ошибку. Со статическим `import` весь `<script type="module">` упал бы, и окно Log осталось пустым.
- Всё, что связано с ошибками импорта, логируется через `L.app.error(...)` — пользователь видит причину прямо в интерфейсе.

### 3.2. Диспетчеризация через `transform()`

Единая точка входа — функция `transform(quads, mode, prefixes)`. Именно сюда попадают все режимы, кроме markdown:

```js
async function transform(quads, mode, prefixes = {}) {
  switch (mode) {
    case 'turtle-prefixes-compact':     return serializeTurtleCustom(quads, {...});
    case 'jsonld-compact':              return serializeJSONLD(quads, 'compact', ...);
    case 'yamlld':                      return serializeYamlLD(quads, ...);
    case 'mermaid':
      if (!rdfToMermaid) throw new Error('mermaid.js не загружен');
      return rdfToMermaid(quads, prefixes);
    default: throw new Error('Неизвестный режим: ' + mode);
  }
}
```

Markdown выпадает из этой схемы — он обрабатывается **отдельной веткой** в `applyFormat`:

```js
if (mode === 'markdown') {
  out = toMarkdown(state.originalText);   // сырой текст, не quads
} else {
  out = await transform(state.originalQuads, mode, state.originalPrefixes);
}
```

Это разделение отражает принципиальную разницу:

| Режим | Вход | Что делает |
|---|---|---|
| Все остальные | `quads` (RDF/JS) | Преобразуют граф в другой формат |
| `markdown` | `state.originalText` | Показывает исходный текст «как есть» |

### 3.3. Отображение в окне Format

| Режим | Как рендерится |
|---|---|
| `markdown` | `<div class="markdown-body">` + HTML от `mdToHtml` |
| `mermaid` | `<code>` + подсветка синтаксиса (простой токенизатор) |
| Turtle / N3 / JSON-LD / YAML-LD | `<code>` + подсветка синтаксиса |

Кнопка **Копировать** во всех случаях копирует **`state.formattedText`** — то есть либо HTML, либо исходный текст Mermaid, либо сериализованное представление. Пользователь сам решает, куда вставить.

---

## 4. Итоговая таблица по библиотекам

| Модуль | Библиотеки | Почему |
|---|---|---|
| `markdown.js` | **нет** | Мини-рендерер (60 строк) закрывает все практические случаи |
| `mermaid.js` | **нет** | Mermaid — это текстовый формат; генерация ≠ рендеринг |
| `parser.js` (внутри `index.html`) | N3.js | Парсинг Turtle в RDF/JS quads |
| `serializer.js` (внутри `index.html`) | N3.js, jsonld, js-yaml | Сериализация quads во все форматы |
| `sparql.js` (внутри `index.html`) | Oxigraph WASM, sparqljs | Выполнение и валидация SPARQL |

Принцип: **минимум внешних зависимостей**, каждая библиотека решает одну конкретную задачу. Тяжёлые пакеты (Mermaid ~2 МБ) не подключаются, если можно обойтись текстовой генерацией.

---

## 5. Как добавить новый режим

Если понадобится ещё один режим (например, «DOT/Graphviz» или «PlantUML»), действовать по той же схеме:

1. Создать `graphviz.js` в папке `ver1/`.
2. Экспортировать функцию `rdfToGraphviz(quads, prefixes)`.
3. В `index.html`:
   - добавить `<option value="graphviz">Graphviz: DOT-граф</option>` в `<select id="sel-format">`;
   - добавить логгер `graphviz: mkLogger('graphviz.js')` в `L`;
   - добавить блок `await import('./graphviz.js')`;
   - добавить `case 'graphviz': return rdfToGraphviz(quads, prefixes);` в `transform()`.

Пять точек правки, все локальные. Остальной код трогать не нужно.
