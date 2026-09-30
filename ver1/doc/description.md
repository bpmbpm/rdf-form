# Описание работы RDF Browser Toolkit

## Назначение

Приложение предназначено для просмотра, преобразования и SPARQL-запросов над RDF-данными
в браузере без серверной части. Реализовано на чистом JavaScript (ES-модули) и публикуется
на GitHub Pages.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                          │
│  (две пары окон: original/format, sparql/result; окно log)  │
└──────────────────────┬──────────────────────────────────────┘
                       │ ES modules
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                          app.js                             │
│  оркестрация: init, события, состояние (state)              │
└──┬────────┬────────┬────────┬────────┬────────┬─────────────┘
   │        │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼        ▼
 logger  loader   parser  serializer sparql  help
   │        │        │        │        │        │
   │        │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼        ▼
 N3.js   fetch   N3.js   N3.js/  Oxigraph  custom
                      jsonld/  WASM      markdown
                      js-yaml              parser
```

## Поток данных

```mermaid
flowchart TD
    A[Пользователь] -->|URL / файл / буфер| B[loader.js]
    B --> C[app.js: setOriginalText]
    C --> D[parser.js: N3.Parser]
    D -->|ошибка| L[logger.js → окно Log]
    D -->|успех| E[quads + prefixes]
    E --> F[app.js: state.originalQuads]
    E --> G[sparql.js: loadStoreFromQuads]
    F --> H[serializer.js: transform]
    H --> I[окно Format]
    G --> J[sparql.js: runQuery]
    J --> K[окно Result]
    K -->|CSV| M[clipboard.js: downloadFile]
```

## Последовательность: загрузка и парсинг Turtle

```mermaid
sequenceDiagram
    participant U as User
    participant A as app.js
    participant L as loader.js
    participant P as parser.js
    participant H as highlighter.js
    participant G as logger.js

    U->>A: click "Загрузить URL"
    A->>L: loadFromUrl(url)
    L->>G: info('loader.js','fetch','GET ...')
    L-->>A: text
    A->>H: highlightTurtle(text)
    H-->>A: HTML
    A->>A: set innerHTML в #view-original
    A->>P: parseTurtle(text)
    P->>G: info('parser.js','N3.Parser','...')
    P-->>A: {quads, prefixes}
    A->>A: loadStoreFromQuads(quads)
    A->>A: applyFormat()
```

## Четыре режима Turtle-сериализации

```mermaid
flowchart LR
    Q[RDF/JS quads] --> G1{Аббревиация<br/>IRI?}
    G1 -->|with prefixes| P1[Есть @prefix, QName]
    G1 -->|without prefixes| P2[Полные IRI в &lt;...&gt;]
    P1 --> G2{Аббревиация<br/>триплетов?}
    P2 --> G2
    G2 -->|predicate-object lists| R1["subject p1 o1, o2 ;<br/>p2 o3 ."]
    G2 -->|explicit triples| R2["subject p1 o1 .<br/>subject p1 o2 .<br/>subject p2 o3 ."]
```

## Логика логирования

Каждый модуль импортирует функции `info/warn/error/debug` из `logger.js` и вызывает их
с указанием:

- уровня (`info`, `warn`, `error`, `debug`),
- имени модуля (например, `parser.js`),
- имени внешней библиотеки (например, `N3.Parser`, `oxigraph.Store`, `fetch`),
- текста сообщения.

Формат строки:

```
[2025-01-15T10:30:00.123Z] [INFO ] [parser.js] [N3.Parser] OK, распарсено 42 триплета
[2025-01-15T10:30:00.456Z] [ERROR] [parser.js] [N3.Parser] Unexpected "}" (строка 3, колонка 5)
```

## Обработка ошибок

1. **Ошибка загрузки** (сеть, CORS) → `logger.js` (error) + сообщение в окно `Original`/`SPARQL`.
2. **Ошибка парсинга Turtle** → очищаем `state.originalQuads`, оставляем текст в `Original`,
   пишем сообщение в `Log`, окно `Format` пустое.
3. **Ошибка SPARQL** → пишем сообщение в `Result` и `Log`, при этом store остаётся валидным.

## Расширяемость

- **Списки по умолчанию** хранятся в `defaults.json`, не требуют пересборки.
- **Новые форматы** добавляются как новые ветки в `serializer.js:transform()`.
- **Новые источники** (например, SPARQL-endpoint) — новый метод в `loader.js`.

## Схема расширения списка по умолчанию

```mermaid
flowchart LR
    A[defaults.json] -->|fetch при init| B[app.js]
    B --> C[sel-default-original]
    B --> D[sel-default-sparql]
    C -->|change| E[loadOriginalFromUrl]
    D -->|change| F[loadSparqlFromUrl]
    G[help.md #adding-defaults] -.->|инструкция| H[Пользователь]
    H -->|правит defaults.json| A
```
