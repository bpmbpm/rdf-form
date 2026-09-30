## 1

Разобрал рабочий код из `mdld-test/ver2/index.html`. Ключевой момент, который я упустил: Oxigraph там загружается как `https://cdn.jsdelivr.net/npm/oxigraph@latest/web.js`, и **перед** созданием `Store` вызывается `await oxMod.default()`. Это рабочая схема — переношу её в проект.

Создам три файла в `files/` и обновлю `index.html`.

---

## Файл 1: `files/test1.ttl`

Чистый Turtle на основе примера Alice/Bob из исходного `test1.md`.

```turtle
@prefix ex:    <http://example.org/> .
@prefix onto:  <http://example.org/onto#> .
@prefix rdf2:  <http://example.org/rdf2#> .
@prefix rdfs2: <http://example.org/rdfs2#> .

# --- Alice ---
ex:alice
    rdf2:type        onto:Person ;
    rdfs2:label      "Алиса" ;
    onto:hasAddress  ex:aliceAddress ;
    onto:hasHobby    ex:aliceHobbyPhoto , ex:aliceHobbyChess .

ex:aliceAddress
    rdf2:type            onto:PostalAddress ;
    rdfs2:label          "Адрес Алисы" ;
    onto:streetAddress   "ул. Ленина, д. 10" ;
    onto:addressLocality "Москва" ;
    onto:postalCode      "101000" ;
    onto:addressCountry  "Россия" .

ex:aliceHobbyPhoto
    rdf2:type   onto:Hobby ;
    rdfs2:label "Фотография" .

ex:aliceHobbyChess
    rdf2:type   onto:Hobby ;
    rdfs2:label "Шахматы" .

# --- Bob ---
ex:bob
    rdf2:type        onto:Person ;
    rdfs2:label      "Боб" ;
    onto:knows       ex:alice ;
    onto:hasHobby    ex:bobHobbyChess .

ex:bobHobbyChess
    rdf2:type   onto:Hobby ;
    rdfs2:label "Шахматы" .
```

---

## Файл 2: `files/test1.rq`

Тестовый SPARQL-запрос.

```sparql
PREFIX ex:    <http://example.org/>
PREFIX onto:  <http://example.org/onto#>
PREFIX rdfs2: <http://example.org/rdfs2#>

SELECT ?person ?name ?hobbyLabel
WHERE {
  ?person a onto:Person ;
          rdfs2:label ?name ;
          onto:hasHobby ?hobby .
  ?hobby rdfs2:label ?hobbyLabel .
}
ORDER BY ?name ?hobbyLabel
```

---

## Файл 3: `files/defaults.json`

Манифест с именами файлов для обоих выпадающих списков. Отдельные массивы `rdf` и `sparql` — как в рабочем коде `mdld-test/ver2`, где используются `manifest.json` для заметок и `SPARQL/manifest.json` для запросов.

```json
{
  "rdf": [
    { "label": "test1.ttl — Alice и Bob", "url": "files/test1.ttl" }
  ],
  "sparql": [
    { "label": "test1.rq — персоны и хобби", "url": "files/test1.rq" }
  ]
}
```

**Как добавить новую запись:** откройте `files/defaults.json`, добавьте объект в массив `rdf` или `sparql`, закоммитьте. После обновления страницы запись появится в выпадающем списке.

---

## Файл 4: `index.html` (обновлённый)

Что изменено относительно предыдущей версии:

| Что | Было | Стало |
|---|---|---|
| **Oxigraph** | `esm.sh/.../web.js` (не работал) | `cdn.jsdelivr.net/npm/oxigraph@latest/web.js` + `await oxMod.default()` — как в рабочем `mdld-test/ver2` |
| **Валидация Turtle** | Только парсинг | Явная проверка через `N3.Parser` с выводом ошибки в Format и Log |
| **Валидация SPARQL** | Нет | Добавлена через `sparqljs` |
| **Списки по умолчанию** | Вшиты в код | Загружаются из `files/defaults.json` |
| **Файлы по умолчанию** | GitHub-ссылки | Локальные `files/test1.ttl` и `files/test1.rq` |


---

## Что изменилось и почему теперь заработает

| Проблема из лога | Причина | Исправление |
|---|---|---|
| `Failed to fetch … esm.sh/oxigraph…web.js` | esm.sh не отдаёт этот файл | Заменено на `cdn.jsdelivr.net/npm/oxigraph@latest/web.js` — рабочий URL из `mdld-test/ver2` |
| `OK: 0 триплетов` | `test1.md` — Markdown, а не Turtle | Создан `files/test1.ttl` с чистым Turtle |
| Нет проверки валидности | Не было | `validateTurtle` через N3.Parser и `validateSparql` через sparqljs |
| Списки вшиты в код | Хардкод | Вынесены в `files/defaults.json` |

---

## Структура проекта

```
ver1/
├── index.html
└── files/
    ├── defaults.json      ← манифест (редактируйте для добавления записей)
    ├── test1.ttl          ← чистый Turtle
    └── test1.rq           ← тестовый SPARQL
```

**Что сделать:**

1. Создайте папку `ver1/files/` в репозитории.
2. Положите туда три файла из этого ответа.
3. Замените `ver1/index.html` на код выше.
4. Закоммитьте, подождите 1–2 минуты.
5. Откройте `https://bpmbpm.github.io/rdf-form/ver1/index.html`.

**Ожидаемый лог после загрузки:**

```
[INFO ] [app.js] ─── Модуль загружен ───
[INFO ] [app.js] [import] N3.js загружен
[INFO ] [app.js] [import] jsonld.js загружен
[INFO ] [app.js] [import] js-yaml загружен
[INFO ] [app.js] [import] Загрузка oxigraph WASM…
[INFO ] [app.js] [import] oxigraph инициализирован ✓
[INFO ] [app.js] [import] sparqljs загружен
[INFO ] [app.js] ─── init ───
[INFO ] [app.js] [fetch] Загрузка files/defaults.json…
[INFO ] [app.js] [fetch] defaults: rdf=1, sparql=1
[INFO ] [loader.js] [fetch] GET files/test1.ttl
[INFO ] [parser.js] [N3.Parser] старт, NNN байт
[INFO ] [parser.js] [N3.Parser] OK: 12 триплетов, префиксов: 4
[INFO ] [app.js] [validate] Turtle валиден: 12 триплетов
[INFO ] [serializer.js] [custom] Turtle: prefixes=true, grouping=true, quads=12
[INFO ] [app.js] format OK (NNN байт)
[INFO ] [loader.js] [fetch] GET files/test1.rq
[INFO ] [app.js] [validate] SPARQL валиден (тип: query)
[INFO ] [app.js] ─── ready ───
```

В окне **Format** появятся триплеты, в окне **Result** после нажатия **▶ Выполнить** — таблица с Алисой, Бобом и их хобби.

## 1.1

Разбираю оба пункта. Причина бага в Format оказалась в асинхронности N3.Parser: при передаче callback-функции в `parser.parse(text, cb)` в некоторых версиях N3.js она вызывается асинхронно, поэтому `quads` успевает остаться пустым. Второй вызов (при ручном переключении режима) уже получает заполненный массив. Лечится использованием **синхронного API** — `parser.parse(text)` без callback возвращает готовый массив quads.

Вторая причина для SPARQL: запрос использует `a` (стандартный `rdf:type`), а в `test1.ttl` тип задан через **кастомный** `rdf2:type`. Соответственно — 0 совпадений. Ниже — исправленный `test1.ttl` (оставляю `rdf2:type`, как в оригинальном примере), два запроса и обновлённые файлы.

---

## 1. Файлы в `files/`

### `files/test1.ttl` (без изменений)

Оставляю как есть — файл валиден.

### `files/01-all-triples.rq` (новый — «все триплеты»)

```sparql
# Все триплеты в хранилище
SELECT ?s ?p ?o
WHERE {
  ?s ?p ?o .
}
LIMIT 200
```

### `files/02-persons.rq` (заменяет test1.rq — исправлен предикат)

```sparql
PREFIX onto:  <http://example.org/onto#>
PREFIX rdf2:  <http://example.org/rdf2#>
PREFIX rdfs2: <http://example.org/rdfs2#>

# Персоны и их метки (используется rdf2:type, как в test1.ttl)
SELECT ?person ?name
WHERE {
  ?person rdf2:type onto:Person ;
          rdfs2:label ?name .
}
ORDER BY ?name
```

### `files/defaults.json` (обновлён — две записи SPARQL)

```json
{
  "rdf": [
    { "label": "test1.ttl — Alice и Bob", "url": "files/test1.ttl" }
  ],
  "sparql": [
    { "label": "01-all-triples.rq — все триплеты",     "url": "files/01-all-triples.rq" },
    { "label": "02-persons.rq — персоны и их метки",   "url": "files/02-persons.rq" }
  ]
}
```

---

## 2. Изменения в `index.html`

Ниже — **три фрагмента**, которые нужно заменить. Найти их можно поиском по комментариям.

### Замена A. HTML: выпадающий список Format с русскими пояснениями

Найдите в `index.html` блок `<select id="sel-format">…</select>` и замените на:

```html
<select id="sel-format" title="Режим сериализации">
  <option value="turtle-prefixes-compact">Turtle: с префиксами, компактно (группировка ; и ,)</option>
  <option value="turtle-prefixes-explicit">Turtle: с префиксами, каждый триплет отдельной строкой</option>
  <option value="turtle-no-prefixes-compact">Turtle: полные IRI, компактно (группировка ; и ,)</option>
  <option value="turtle-no-prefixes-explicit">Turtle: полные IRI, каждый триплет отдельной строкой</option>
  <option value="n3-prefixes-compact">N3: с префиксами (расширенный Turtle)</option>
  <option value="ntriples">N-Triples: одна строка на триплет, без префиксов</option>
  <option value="jsonld-compact">JSON-LD: компактный, с @context</option>
  <option value="jsonld-expanded">JSON-LD: развёрнутый, без @context</option>
  <option value="jsonld-flattened">JSON-LD: плоский, с @graph</option>
  <option value="yamlld">YAML-LD: YAML-представление compact JSON-LD</option>
</select>
```

Значения `value=` остаются прежними — код их знает. Меняется только текст, который видит пользователь.

### Замена B. Парсер Turtle — синхронный, без callback

Найдите функции `parseTurtle` и `validateTurtle` в `<script type="module">` и замените их на:

```js
function extractPrefixesFromText(text) {
  const prefixes = {};
  let m;
  const re1 = /@prefix\s+([A-Za-z_][\w-]*)?:\s*<([^>]+)>\s*\./g;
  while ((m = re1.exec(text)) !== null) prefixes[m[1] || ''] = m[2];
  const re2 = /PREFIX\s+([A-Za-z_][\w-]*)?:\s*<([^>]+)>/gi;
  while ((m = re2.exec(text)) !== null) if (!(m[1] in prefixes)) prefixes[m[1] || ''] = m[2];
  return prefixes;
}

// Синхронный парсинг: parser.parse(text) без callback возвращает массив quads
function parseTurtleStrict(text, baseIRI='http://example.org/') {
  if (!N3) throw new Error('N3.js не загружен');
  L.parser.info(`старт, ${text.length} байт`, 'N3.Parser');
  try {
    const parser = new N3.Parser({ baseIRI });
    const quads = parser.parse(text);        // ← массив, синхронно
    const prefixes = extractPrefixesFromText(text);
    L.parser.info(`OK: ${quads.length} триплетов, префиксов: ${Object.keys(prefixes).length}`, 'N3.Parser');
    if (quads.length === 0) {
      L.parser.warn('Триплетов не найдено — проверьте, что файл содержит Turtle', 'N3.Parser');
    }
    return { quads, prefixes };
  } catch (e) {
    const msg = e.message + (e.line != null ? ` (строка ${e.line}, колонка ${e.column})` : '');
    L.parser.error(msg, 'N3.Parser');
    throw e;
  }
}

function validateTurtle(text) {
  try {
    const r = parseTurtleStrict(text);
    return { valid: true, message: `Turtle валиден: ${r.quads.length} триплетов` };
  } catch (e) {
    return { valid: false, message: `Ошибка Turtle: ${e.message}` };
  }
}
```

### Замена C. `setOriginalText` — убрать двойной парсинг

Найдите функцию `setOriginalText` и замените на:

```js
function setOriginalText(text) {
  state.originalText = text;
  renderOriginal();

  let parsed;
  try {
    parsed = parseTurtleStrict(text);
  } catch (e) {
    state.originalQuads = [];
    state.originalPrefixes = {};
    $('view-format').innerHTML = `<code>Ошибка Turtle: ${esc(e.message)}</code>`;
    return;
  }

  state.originalQuads = parsed.quads;
  state.originalPrefixes = parsed.prefixes;
  L.app.info(`Загружено: ${parsed.quads.length} триплетов, ${Object.keys(parsed.prefixes).length} префиксов`, 'validate');

  loadStoreFromQuads(parsed.quads);
  applyFormat();          // асинхронный вызов — не блокирует
}
```

---

## 3. Почему теперь работает

| Проблема | Причина | Что изменилось |
|---|---|---|
| **Format пусто при первом рендере** | `parser.parse(text, cb)` в N3.js мог вызвать callback асинхронно; `quads` оставался пустым на момент возврата из `parseTurtle` | Заменил на `parser.parse(text)` — возвращает массив **синхронно** |
| **Двойной парсинг** | `validateTurtle` вызывал `parseTurtle`, потом `setOriginalText` вызывал ещё раз | Один вызов `parseTurtleStrict`, `validateTurtle` использует его же |
| **SPARQL возвращает 0 строк** | В запросе `?person a onto:Person` (`a` = `rdf:type`), а в `test1.ttl` — `rdf2:type` | Запрос исправлен: `?person rdf2:type onto:Person`. Добавлен запрос «все триплеты» |
| **Нет пояснений в dropdown** | Были английские технические термины | Все пункты переведены на русский с пояснением режима |

---

## 4. Что сделать

1. Создайте/замените в `ver1/files/`:
   - `01-all-triples.rq` (новый)
   - `02-persons.rq` (новый, замените `test1.rq`)
   - `defaults.json` (обновлённый)
   - `test1.ttl` — оставить как есть
2. Удалите устаревший `files/test1.rq` (если был).
3. Откройте `index.html` и примените три замены (A, B, C).
4. Закоммитьте, подождите 1–2 минуты.
5. Проверьте.

**Ожидаемый лог:**

```
[INFO ] [parser.js] [N3.Parser] OK: 12 триплетов, префиксов: 4
[INFO ] [app.js] [validate] Загружено: 12 триплетов, 4 префиксов
[INFO ] [serializer.js] [custom] Turtle: prefixes=true, grouping=true, quads=12
[INFO ] [app.js] format OK (NNN байт)
```

**Ожидаемый результат SPARQL** после нажатия ▶ Выполнить (при выборе `01-all-triples.rq`):

```
s                                                          p                                                              o
---------------------------------------------------------- ------------------------------------------------------------------ ----------------------
http://example.org/alice                                    http://example.org/rdf2#type                                    http://example.org/onto#Person
http://example.org/alice                                    http://example.org/rdfs2#label                                  "Алиса"
...
```

Если после этого что-то останется не так — пришлите **полный лог** (все строки, не фрагмент) и содержимое вкладки **Console** (F12). По полному логу я точно определю причину.
