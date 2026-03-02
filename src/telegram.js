import TelegramBot from 'node-telegram-bot-api';
import { config, getChatId, setChatId } from './config.js';

const bot = new TelegramBot(config.telegram.botToken, { polling: false });

function safeStringify(value) {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Send text message to configured Telegram chat (group or user).
 * Chat ID берётся из файла .telegram-chat-id (если бот добавлен в группу) или из TELEGRAM_CHAT_ID в .env.
 * @param {string} text
 * @returns {Promise<import('node-telegram-bot-api').Message>}
 */
export async function sendToTelegram(text) {
  const chatId = getChatId();
  if (!chatId) {
    throw new Error(
      'Chat ID не задан. Добавь бота в группу (он сам подхватит ID) или укажи TELEGRAM_CHAT_ID в .env'
    );
  }
  return bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/**
 * Включает приём команд и авто-подключение при добавлении в группу.
 * При добавлении в группу бот сохраняет ID и пишет логи туда без настройки .env.
 */
export function startBotCommands() {
  // Как только бота добавили в группу — сохраняем chat ID и пишем сюда логи
  bot.on('my_chat_member', (myChatMember) => {
    const { chat, new_chat_member } = myChatMember || {};
    if (!chat || !new_chat_member) return;
    const isGroup = chat.type === 'group' || chat.type === 'supergroup';
    const added = ['member', 'administrator'].includes(new_chat_member.status);
    if (isGroup && added) {
      setChatId(chat.id);
      bot.sendMessage(chat.id, '✅ Подключился. Логи буду слать сюда — все в группе будут видеть.', {
        parse_mode: 'HTML',
      });
      console.log(`[bot] Connected to group, chat ID saved: ${chat.id}`);
    }
  });

  const replyWithChatId = (msg) => {
    const chatId = msg.chat.id;
    const isGroup = msg.chat.type !== 'private';
    const text =
      (isGroup ? `👥 ID этой группы: ` : `🆔 Твой chat ID: `) +
      `<code>${chatId}</code>\n\n` +
      `Можешь добавить в <code>.env</code>: <code>TELEGRAM_CHAT_ID=${chatId}</code>\n` +
      `Либо просто добавь бота в группу — он сам подхватит ID при добавлении.`;
    return bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
  };

  bot.onText(/\/chatid/, replyWithChatId);
  bot.onText(/\/start/, replyWithChatId);
  bot.startPolling();
  console.log('Bot: /start, /chatid. Add bot to a group — it will use that group for logs automatically.');
}

/**
 * Format incoming request as a readable message for Telegram
 * @param {object} payload - { type?, method, path, body?, query?, headers? }
 */
export function formatLogMessage(payload) {
  const isFrontend = payload.type === 'frontend';
  const isBackend = payload.type === 'backend';

  // Для фронта: просто показать сообщение, которое ты передал
  if (isFrontend) {
    const msg = safeStringify(
      payload?.body && typeof payload.body === 'object' && 'message' in payload.body
        ? payload.body.message
        : payload.body
    );
    const parts = [
      '<b>⚠️ Frontend</b>',
      `<code>${payload.method ?? 'POST'} ${payload.path ?? '/log'}</code>`,
    ];
    if (msg) {
      parts.push('', `<pre>${msg}</pre>`);
    }
    return parts.join('\n');
  }

  const title = isBackend ? '💥 Ошибка на бэкенде' : '📩 Новый запрос';

  const lines = [
    `<b>${title}</b>`,
    `<code>${payload.method ?? 'GET'} ${payload.path ?? '/'}</code>`,
  ];

  if (payload.type) {
    lines.push(`\n<b>Тип:</b> <code>${payload.type}</code>`);
  }

  if (payload.query && Object.keys(payload.query).length > 0) {
    const queryStr = safeStringify(payload.query);
    lines.push(`\n<b>Query:</b>\n<pre>${queryStr}</pre>`);
  }
  if (payload.body !== undefined && payload.body !== null) {
    const bodyStr = safeStringify(payload.body);
    if (bodyStr.length > 3500) {
      lines.push(`\n<b>Body:</b>\n<pre>${bodyStr.slice(0, 3500)}...</pre>`);
    } else {
      lines.push(`\n<b>Body:</b>\n<pre>${bodyStr}</pre>`);
    }
  }
  if (payload.headers && Object.keys(payload.headers).length > 0) {
    const headersStr = safeStringify(payload.headers);
    if (headersStr.length > 500) {
      lines.push(`\n<b>Headers:</b>\n<pre>${headersStr.slice(0, 500)}...</pre>`);
    } else {
      lines.push(`\n<b>Headers:</b>\n<pre>${headersStr}</pre>`);
    }
  }
  return lines.join('\n');
}
