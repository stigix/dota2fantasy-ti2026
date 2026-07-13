# Dota 2 Fantasy — The International 2026

Обновлённая версия калькулятора `bydoodle/dota2fantasy` для **The International 2026**.

## Что уже сделано

- 16 команд и 80 игроков TI 2026 в `players.json`.
- Шесть турниров перед TI в `leagues.json`:
  - PGL Wallachia Season 7;
  - ESL One Birmingham 2026;
  - PGL Wallachia Season 8;
  - DreamLeague Season 29;
  - BLAST Slam VII;
  - Esports World Cup 2026.
- Переключатель интерфейса **RU / EN**.
- Выбор турниров, роли, пяти показателей карточки, множителей качества, титула и субтитра.
- Динамический рейтинг игроков без жёстко прописанного игрока или ID турнира.
- Инкрементальный Python-парсер OpenDota + STRATZ с кэшем, повторными попытками и безопасной записью JSON.
- Автоматическая публикация через GitHub Pages.

> В архиве статистика инициализирована пустой. Чтобы заполнить её актуальными матчами, запусти парсер.

## 1. Настройка Python-парсера

Требуется Python 3.11+.

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
pip install -r requirements.txt
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Создай `.env` рядом с `main.py`:

```env
STRATZ_TOKEN=ТВОЙ_НОВЫЙ_STRATZ_TOKEN
```

Не добавляй `.env` в Git. Токен, который когда-либо отправлялся в чат или публиковался, лучше отозвать и заменить новым.

### Сбор всех шести турниров

```bash
python main.py
```

### Тест на нескольких матчах

```bash
python main.py --limit 3
```

### Только один турнир

```bash
python main.py --league 19785
```

### Полный пересчёт

```bash
python main.py --reset
```

### Без STRATZ

```bash
python main.py --skip-stratz
```

После обработки обновятся `players_stat.json`, `leagues.json` и `dataset_meta.json`.

## 2. Запуск сайта

Требуется Node.js 22+.

```bash
cd dota2parser
npm ci
npm run dev
```

Production-сборка:

```bash
npm run lint
npm run build
```

Готовые файлы появятся в `dota2parser/dist`.

## 3. GitHub Pages

1. Загрузи проект в новый GitHub-репозиторий.
2. Открой **Settings → Pages**.
3. В **Build and deployment → Source** выбери **GitHub Actions**.
4. Сделай push в ветку `main` или `master`.

Workflow `.github/workflows/deploy-pages.yml` соберёт и опубликует сайт. Для статического сайта STRATZ-токен в GitHub Pages не нужен: парсер запускается отдельно, а сайт читает готовые JSON-файлы.

### Автообновление статистики

В **Settings → Secrets and variables → Actions** создай Repository secret с именем `STRATZ_TOKEN` и вставь туда новый токен. Workflow `.github/workflows/update-stats.yml` будет ежедневно дополнять матчи до завершения EWC 2026. Его также можно запустить вручную во вкладке **Actions**, включая полный пересчёт через параметр `reset`.

## Структура

- `main.py` — сбор и расчёт статистики.
- `players.json` — составы и алиасы игроков.
- `leagues.json` — выбранные шесть турниров и прогресс обработки.
- `players_stat.json` — данные для интерфейса.
- `dataset_meta.json` — дата генерации и информация о датасете.
- `dota2parser/` — React/Vite-интерфейс.

## Credits

Основано на публичном проекте [bydoodle/dota2fantasy](https://github.com/bydoodle/dota2fantasy). Перед публичным распространением проверь условия использования исходного кода и сохрани авторство оригинального проекта.

---

## English quick start

Create a fresh `.env` file with `STRATZ_TOKEN`, run `pip install -r requirements.txt`, then `python main.py`. Start the UI with `cd dota2parser`, `npm ci`, and `npm run dev`. The language can be switched between Russian and English in the header.
