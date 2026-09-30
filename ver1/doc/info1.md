# Браузерное JS-приложение для работы с RDF

Ниже — полный рабочий код. Структура файлов:

```
/
├── index.html
├── styles.css
├── app.js
├── defaults.json
├── help.md
├── README.md
├── modules/
│   ├── logger.js
│   ├── highlighter.js
│   ├── loader.js
│   ├── parser.js
│   ├── serializer.js
│   ├── sparql.js
│   ├── clipboard.js
│   └── help.js
└── doc/
    └── description.md
```

---

## `help.md`


# RDF Browser Toolkit — справка

## Быстрый старт

1. В поле **URL** окна `Original` вставьте ссылку на Turtle-файл и нажмите **Загрузить URL**.
2. Приложение распарсит Turtle и покажет его с подсветкой. Все ошибки парсинга попадают в окно `Log`.
3. Справа, в окне `Format`, выберите режим преобразования и скопируйте результат.
4. Для SPARQL: загрузите `.rq` файл и нажмите **▶ Выполнить**. Результат появится в окне `Result`.

## <a id="adding-defaults"></a>Добавление в список «По умолчанию»

Список по умолчанию хранится в файле `defaults.json` в корне репозитория.
Чтобы добавить новую запись:

1. Откройте `defaults.json` в редакторе.
2. Добавьте объект в массив `original` (для Turtle) или `sparql`:

   ```json
   {
     "label": "Мой тест",
     "url": "https://github.com/user/repo/blob/main/path/file.ttl"
   }
   ```

3. Сохраните, сделайте commit и push. После обновления страницы запись появится в выпадающем списке.

> Поддерживаются как «обычные» ссылки `github.com/.../blob/...`, так и `raw.githubusercontent.com/...`.
> Первые автоматически преобразуются в raw-URL.

## <a id="formats"></a>Режимы преобразования Turtle

| Режим | Что делает |
|---|---|
| **with prefixes + predicate-object lists** | Оставляет `@prefix`, триплеты группируются через `;` и `,` |
| **with prefixes + explicit triples** | Оставляет `@prefix`, но каждый триплет — отдельной строкой |
| **without prefixes + predicate-object lists** | Раскрывает все IRI, но использует `;` и `,` |
| **without prefixes + explicit triples** | Раскрывает все IRI и каждый триплет пишет отдельно |
| **N-Triples** | Построчный формат, без префиксов и группировки |
| **JSON-LD compact / expanded / flattened** | Соответствующие операции над JSON-LD |
| **YAML-LD** | YAML-представление compact JSON-LD (через `js-yaml`) |

## Клавиши и буфер

- **Из буфера** — вставляет содержимое системного буфера обмена в соответствующее окно.
- **Копировать** — копирует текущее содержимое окна в буфер.
- **Сохранить (CSV)** — скачивает результат SPARQL в CSV.

## Ограничения

- Внешние URL должны отдавать CORS-заголовки. Для GitHub используйте `raw.githubusercontent.com`.
- YAML-LD находится в статусе черновика W3C; используется fallback через JSON-LD.

---

## `README.md`

# RDF Browser Toolkit

Браузерное приложение для просмотра, преобразования и запроса RDF-данных.
Публикуется на GitHub Pages. Без сборки — только статические ES-модули и CDN.

## Возможности

- Просмотр Turtle с подсветкой синтаксиса.
- Загрузка по URL, из файла, из буфера обмена; расширяемый список «по умолчанию».
- 4 режима сериализации Turtle (по спецификации W3C Turtle 1.1):
  `with prefixes / without prefixes` × `predicate-object lists / explicit triples`.
- Сериализация в N3, N-Triples, JSON-LD (compact/expanded/flattened), YAML-LD.
- Выполнение SPARQL в браузере (Oxigraph WASM) с сохранением результатов в CSV.
- Подробный лог вызовов функций и внешних библиотек.

## Публикация

1. Форкните репозиторий.
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)`.
3. Откройте `https://<username>.github.io/<repo>/`.

## Структура

```
index.html
styles.css
app.js
defaults.json
help.md
modules/
├── logger.js
├── highlighter.js
├── loader.js
├── parser.js
├── serializer.js
├── sparql.js
├── clipboard.js
└── help.js
doc/
└── description.md
```

## Зависимости (CDN)

| Библиотека | Назначение |
|---|---|
| `n3` | Парсинг Turtle/N-Triples/N3, RDF/JS quads |
| `jsonld` | JSON-LD: fromRDF, compact, expand, flatten |
| `js-yaml` | Сериализация YAML (для YAML-LD) |
| `oxigraph` | In-memory RDF store + SPARQL 1.1 (WASM) |



## Что важно помнить при публикации

1. **CORS**: GitHub `blob`-ссылки приложение автоматически конвертирует в `raw.githubusercontent.com` (см. `loader.js:toRawUrl`). Для других источников нужны CORS-заголовки.
2. **Import Map**: браузеры поддерживают import maps с 2021 года. Если нужна поддержка старых браузеров — соберите проект через Vite/Webpack.
3. **Oxigraph WASM**: библиотека подгружает `.wasm` из CDN автоматически, но при первом запросе возможна задержка 200–500 мс. Сообщение о загрузке пишется в `Log`.
4. **JSON-LD `context`**: в режиме `compact` используется `@context`, собранный из префиксов исходного Turtle. Если исходный документ не содержал `@prefix`, будет использоваться пустой контекст и JSON-LD останется expanded.
5. **YAML-LD**: полноценного браузерного процессора YAML-LD нет, поэтому применяется цепочка `Turtle → quads → JSON-LD (compact) → js-yaml.dump()`. Результат — YAML-представление JSON-LD, семантически корректное, но не гарантирующее точное соответствие черновику YAML-LD CG.
