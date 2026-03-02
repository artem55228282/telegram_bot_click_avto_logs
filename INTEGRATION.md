# Подключение проекта к Telegram-боту логов

Скопируй этот файл в свой проект и отдай ИИ. Он настроит отправку логов с фронта и бэка в Telegram.

---

## Endpoint

```
https://tg-avto-logs-artembolshakov.amvera.io/log
```

Локально (если бот запущен рядом):
```
http://localhost:3000/log
```

---

## Формат запросов

Все запросы — `POST` с `Content-Type: application/json`.

### 1. Логи с фронтенда (`type: frontend`)

Форматирование полностью на твоей стороне. Бот просто выведет твой текст.

**Body:**
```json
{
  "type": "frontend",
  "message": "Любой текст, который ты хочешь показать в Telegram. Можешь использовать \\n, эмодзи, структуру — как удобно."
}
```

**Пример:**
```json
{
  "type": "frontend",
  "message": "[FRONT][/profile]\nUser 123: failed to load data\nError: NetworkError when attempting to fetch resource"
}
```

### 2. Логи с бэкенда (`type: backend`)

Ошибки API (axios response). Бот красиво отформатирует.

**Body:**
```json
{
  "type": "backend",
  "error": {
    "message": "Request failed with status code 500",
    "status": 500,
    "url": "https://api.example.com/users",
    "method": "GET",
    "data": { "error": "Internal Server Error" }
  }
}
```

---

## Что нужно сделать в проекте

### 1. Переменная окружения

Добавь в `.env` (или в настройки деплоя):

```
VITE_LOGS_URL=https://tg-avto-logs-artembolshakov.amvera.io/log
```

Или для React/Next:
```
NEXT_PUBLIC_LOGS_URL=https://tg-avto-logs-artembolshakov.amvera.io/log
```

Используй префикс, который доступен на клиенте (VITE_, NEXT_PUBLIC_, REACT_APP_ и т.п.).

### 2. Утилита отправки логов

Создай функцию, которая шлёт логи на endpoint. Пример:

```js
const LOGS_URL = import.meta.env.VITE_LOGS_URL || process.env.NEXT_PUBLIC_LOGS_URL;

export async function sendLog(type, payload) {
  if (!LOGS_URL) return;
  try {
    await fetch(LOGS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'frontend' ? { type, message: payload } : { type, error: payload }),
    });
  } catch (e) {
    console.warn('Failed to send log:', e);
  }
}
```

### 3. Интеграция с axios (бэкенд-ошибки)

Добавь interceptor в `axios`, который при ошибке вызывает `sendLog('backend', ...)`:

```js
axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    await sendLog('backend', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
```

### 4. Интеграция на фронте (фронтенд-ошибки)

В глобальном обработчике ошибок (например, `window.onerror`, React Error Boundary, Vue errorHandler) вызывай:

```js
sendLog('frontend', `[FRONT][${location.pathname}]\n${error.message}\n${error.stack || ''}`);
```

Формат `message` — полностью на твоё усмотрение. Бот просто выведет его как есть.

---

## Чеклист для ИИ

- [ ] Добавить переменную `VITE_LOGS_URL` (или аналог) в `.env.example` и `.env`
- [ ] Создать утилиту `sendLog(type, payload)` для отправки на endpoint
- [ ] Настроить axios interceptor для `type: 'backend'` при ошибках
- [ ] Подключить отправку `type: 'frontend'` в глобальный обработчик ошибок (onerror / Error Boundary / errorHandler)
- [ ] Не блокировать UI при ошибке отправки логов (try/catch, fire-and-forget)
