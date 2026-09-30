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
