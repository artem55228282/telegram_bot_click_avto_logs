import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const required = ['TELEGRAM_BOT_TOKEN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[config] Missing required env: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill the values.');
  process.exit(1);
}

// В облаке Amvera используем /data для сохранения между пересборками
const CHAT_ID_FILE =
  fs.existsSync('/data') ? '/data/.telegram-chat-id' : path.join(process.cwd(), '.telegram-chat-id');

/** Чат для логов: сначала из файла (если бот добавлен в группу), иначе из .env */
export function getChatId() {
  try {
    if (fs.existsSync(CHAT_ID_FILE)) {
      const id = fs.readFileSync(CHAT_ID_FILE, 'utf8').trim();
      if (id) return id;
    }
  } catch (_) {}
  return process.env.TELEGRAM_CHAT_ID || null;
}

/** Сохранить chat ID (вызывается при добавлении бота в группу) */
export function setChatId(chatId) {
  fs.writeFileSync(CHAT_ID_FILE, String(chatId), 'utf8');
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  env: process.env.NODE_ENV || 'development',
  CHAT_ID_FILE,
};
