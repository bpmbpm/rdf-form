## 1

Я подготовил для вас подробное описание каждого режима сериализации, доступного в выпадающем меню «Format». В нем указаны названия на русском и английском языках, а также ссылки на официальные спецификации W3C.

---

### 📜 Режимы сериализации в окне Format

#### 1. Turtle (компактный)
- **Название в интерфейсе:** `Turtle: с префиксами, компактно (группировка ; и ,)`
- **English name:** `Turtle: with prefixes + predicate-object lists`
- **Спецификация:** [RDF 1.1 Turtle (W3C Recommendation)](https://www.w3.org/TR/turtle/)
- **Описание:** Это наиболее читаемый и компактный формат Turtle. Он использует объявления `@prefix` для сокращения длинных IRI (например, `ex:Person` вместо `http://example.org/Person`). Триплеты с одинаковым субъектом группируются с помощью точки с запятой (`;`), а объекты с одинаковым предикатом — с помощью запятой (`,`). Это самый популярный формат для ручного написания и чтения RDF.

#### 2. Turtle (явный)
- **Название в интерфейсе:** `Turtle: с префиксами, каждый триплет отдельной строкой`
- **English name:** `Turtle: with prefixes + explicit triples`
- **Спецификация:** [RDF 1.1 Turtle (W3C Recommendation)](https://www.w3.org/TR/turtle/)
- **Описание:** Этот режим также использует префиксы, но отказывается от группировки. Каждый триплет записывается на отдельной строке с полным указанием субъекта, предиката и объекта. Это облегчает машинную обработку и сравнение, но делает документ более многословным.

#### 3. Turtle (полные IRI, компактный)
- **Название в интерфейсе:** `Turtle: полные IRI, компактно (группировка ; и ,)`
- **English name:** `Turtle: without prefixes + predicate-object lists`
- **Спецификация:** [RDF 1.1 Turtle (W3C Recommendation)](https://www.w3.org/TR/turtle/)
- **Описание:** Здесь все IRI раскрываются полностью (в угловых скобках `<...>`), но сохраняется компактная группировка триплетов. Это полезно, когда нужно избежать зависимости от объявлений префиксов, но при этом сохранить читаемость.

#### 4. Turtle (полные IRI, явный)
- **Название в интерфейсе:** `Turtle: полные IRI, каждый триплет отдельной строкой`
- **English name:** `Turtle: without prefixes + explicit triples`
- **Спецификация:** [RDF 1.1 Turtle (W3C Recommendation)](https://www.w3.org/TR/turtle/)
- **Описание:** Самый развернутый формат. Все IRI записываются полностью, и каждый триплет находится на отдельной строке. Это максимально однозначное, но наименее компактное представление.

#### 5. N3 (Notation3)
- **Название в интерфейсе:** `N3: с префиксами (расширенный Turtle)`
- **English name:** `N3: with prefixes (Notation3)`
- **Спецификация:** [Notation3 (N3) Specification](https://w3c.github.io/N3/spec/) (в статусе Working Draft)
- **Описание:** N3 — это расширение Turtle, добавляющее поддержку правил вывода, кванторов и других конструкций для логических выражений. Он был разработан Тимом Бернерсом-Ли. В данном приложении используется для вывода RDF-графа с сохранением префиксов; полная поддержка логических возможностей N3 здесь не реализована.

#### 6. N-Triples
- **Название в интерфейсе:** `N-Triples: одна строка на триплет, без префиксов`
- **English name:** `N-Triples`
- **Спецификация:** [RDF 1.1 N-Triples (W3C Recommendation)](https://www.w3.org/TR/n-triples/)
- **Описание:** Простой построчный формат, где каждый триплет записывается на отдельной строке в виде `субъект предикат объект .`. Все IRI указываются полностью, без префиксов. Это подмножество Turtle, ориентированное на простоту машинного парсинга и потоковую обработку.

#### 7. JSON-LD (компактный)
- **Название в интерфейсе:** `JSON-LD: компактный, с @context`
- **English name:** `JSON-LD: compact`
- **Спецификация:** [JSON-LD 1.1 (W3C Recommendation)](https://www.w3.org/TR/json-ld11/)
- **Описание:** Формат JSON-LD, в котором используется секция `@context` для сопоставления коротких ключей JSON с полными IRI. Это делает документ похожим на обычный JSON и очень удобным для интеграции с существующими API.

#### 8. JSON-LD (развёрнутый)
- **Название в интерфейсе:** `JSON-LD: развёрнутый, без @context`
- **English name:** `JSON-LD: expanded`
- **Спецификация:** [JSON-LD 1.1 (W3C Recommendation)](https://www.w3.org/TR/json-ld11/)
- **Описание:** Формат JSON-LD, в котором все ключи и значения являются полными IRI. Документ представляет собой массив объектов, каждый из которых содержит пары `"@id"`, `"@type"`, `"@value"` и т.д. Это самая строгая и однозначная форма JSON-LD.

#### 9. JSON-LD (плоский)
- **Название в интерфейсе:** `JSON-LD: плоский, с @graph`
- **English name:** `JSON-LD: flattened`
- **Спецификация:** [JSON-LD 1.1 (W3C Recommendation)](https://www.w3.org/TR/json-ld11/)
- **Описание:** Формат JSON-LD, в котором все узлы графа вынесены в отдельный массив `@graph`. Это упрощает обработку, так как все узлы находятся на одном уровне, без вложенности.

#### 10. YAML-LD
- **Название в интерфейсе:** `YAML-LD: YAML-представление compact JSON-LD`
- **English name:** `YAML-LD`
- **Спецификация:** [YAML-LD (W3C Community Group Final Specification)](https://www.w3.org/community/reports/json-ld/CG-FINAL-yaml-ld-20231206/)
- **Описание:** YAML-LD — это сериализация JSON-LD в формате YAML. YAML более удобен для ручного чтения и широко используется в конфигурационных файлах. Поскольку браузерных реализаций YAML-LD пока нет, в приложении используется цепочка: RDF → JSON-LD (compact) → YAML. Это дает семантически корректное представление, совместимое с черновиком спецификации.

---

### 🗺️ Сводная таблица

| № | Режим (рус.) | Режим (англ.) | Формат | Спецификация |
|---|---|---|---|---|
| 1 | Turtle: с префиксами, компактно | Turtle: with prefixes + predicate-object lists | Turtle | [W3C Turtle](https://www.w3.org/TR/turtle/) |
| 2 | Turtle: с префиксами, явный | Turtle: with prefixes + explicit triples | Turtle | [W3C Turtle](https://www.w3.org/TR/turtle/) |
| 3 | Turtle: полные IRI, компактно | Turtle: without prefixes + predicate-object lists | Turtle | [W3C Turtle](https://www.w3.org/TR/turtle/) |
| 4 | Turtle: полные IRI, явный | Turtle: without prefixes + explicit triples | Turtle | [W3C Turtle](https://www.w3.org/TR/turtle/) |
| 5 | N3: с префиксами | N3: with prefixes | Notation3 | [N3 Spec (WD)](https://w3c.github.io/N3/spec/) |
| 6 | N-Triples | N-Triples | N-Triples | [W3C N-Triples](https://www.w3.org/TR/n-triples/) |
| 7 | JSON-LD: компактный | JSON-LD: compact | JSON-LD | [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) |
| 8 | JSON-LD: развёрнутый | JSON-LD: expanded | JSON-LD | [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) |
| 9 | JSON-LD: плоский | JSON-LD: flattened | JSON-LD | [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) |
| 10 | YAML-LD | YAML-LD | YAML-LD | [W3C YAML-LD (CG)](https://www.w3.org/community/reports/json-ld/CG-FINAL-yaml-ld-20231206/) |

Если потребуется задокументировать внутреннюю логику этих режимов (флаги `usePrefixes` и `useGrouping`), дайте знать — я подготовлю отдельный раздел.
