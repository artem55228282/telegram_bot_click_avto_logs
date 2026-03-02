# Telegram Bot — пуши логов в группу

Сервер на Node.js принимает HTTP-запросы и шлёт их в Telegram. **Все в группе видят логи.**

## Подключение к группе (автоматически)

1. Создай бота в [@BotFather](https://t.me/BotFather), получи токен.
2. В `.env` укажи только **TELEGRAM_BOT_TOKEN** (TELEGRAM_CHAT_ID не нужен).
3. Запусти сервер: `npm run dev` или `npm start`.
4. **Добавь бота в группу** — он сразу подхватит чат и напишет: «Подключился. Логи буду слать сюда».
5. Готово: все запросы на `POST/GET /log` уходят в эту группу, видят все.

ID группы бот сохраняет в файл `.telegram-chat-id`. Перезапуск не нужен. Чтобы слать логи в другую группу — добавь бота в неё (последняя группа, куда добавили, будет использоваться), либо пропиши `TELEGRAM_CHAT_ID` в `.env`.

## Установка

```bash
npm install
```

## Настройка

1. Скопируйте пример переменных окружения:
   ```bash
   cp .env.example .env
   ```

2. Заполните `.env`:
   - **TELEGRAM_BOT_TOKEN** — токен от [@BotFather](https://t.me/BotFather) (обязательно).
   - **TELEGRAM_CHAT_ID** — необязательно: если не указать, добавь бота в группу — он сам сохранит ID.

3. Опционально:
   - **PORT** — порт сервера (по умолчанию `3000`).
   - **NODE_ENV** — `development` или `production`.

## Запуск

```bash
npm start
```

Режим разработки с автоперезапуском:

```bash
npm run dev
```

## API

- **GET/POST `/log`** — тело запроса (query, body) отправляется в Telegram.
- **GET/POST `/log/*`** — то же для любых путей, например `/log/click`, `/log/event`.
- **GET `/health`** — проверка работы сервера.

### Примеры

```bash
# Отправить JSON
curl -X POST http://localhost:3000/log \
  -H "Content-Type: application/json" \
  -d '{"event":"click","source":"site"}'

# Отправить с query
curl "http://localhost:3000/log?action=open&id=123"
```

Сообщения в Telegram приходят в формате: метод, путь, query, body (и headers в `development`).

## Команды бота

- **Добавить в группу** — бот сам подхватывает чат и пишет логи туда (ничего вручную настраивать не нужно).
- **`/chatid`** — бот присылает ID чата/группы (удобно, если хочешь прописать TELEGRAM_CHAT_ID в `.env` вручную).
- **`/start`** — то же, что `/chatid`.
