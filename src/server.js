import express from 'express';
import { config } from './config.js';
import { sendToTelegram, formatLogMessage, startBotCommands } from './telegram.js';

const app = express();

// CORS headers for cross-origin requests (localhost → Amvera)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

app.use(express.json());
app.use(express.text({ type: '*/*' }));

// CORS preflight — не логируем в Telegram, только отвечаем
app.options('/log', (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
  res.sendStatus(204);
});
app.options('/log/*', (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
  res.sendStatus(204);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'telegram-bot-logs' });
});

// Main endpoint: receive payload and forward to Telegram (только POST)
app.post('/log', async (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
  try {
    const type = (req.body && req.body.type) || req.query.type || undefined;
    const payload = {
      type,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? req.query : undefined,
      body: req.body,
      headers: config.env === 'development' ? req.headers : undefined,
    };
    const text = formatLogMessage(payload);
    await sendToTelegram(text);
    res.status(200).json({ ok: true, sent: true });
  } catch (err) {
    console.error('Telegram send error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Optional: accept any path and log (e.g. /log/click, /log/event)
app.post('/log/*', async (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
  try {
    const type = (req.body && req.body.type) || req.query.type || undefined;
    const payload = {
      type,
      method: req.method,
      path: req.originalUrl,
      query: Object.keys(req.query).length ? req.query : undefined,
      body: req.body,
      headers: config.env === 'development' ? req.headers : undefined,
    };
    const text = formatLogMessage(payload);
    await sendToTelegram(text);
    res.status(200).json({ ok: true, sent: true });
  } catch (err) {
    console.error('Telegram send error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

const server = app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
  console.log(`POST /log — send request data to Telegram`);
  startBotCommands();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use.`);
    console.error('Either stop the other process or set PORT in .env (e.g. PORT=3001).');
    process.exit(1);
  }
  throw err;
});
