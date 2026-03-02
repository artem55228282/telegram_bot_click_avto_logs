import express from 'express';
import { config } from './config.js';
import { sendToTelegram, formatLogMessage, startBotCommands } from './telegram.js';

const app = express();

app.use(express.json());
app.use(express.text({ type: '*/*' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'telegram-bot-logs' });
});

// Main endpoint: receive payload and forward to Telegram
app.all('/log', async (req, res) => {
  try {
    const payload = {
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
app.all('/log/*', async (req, res) => {
  try {
    const payload = {
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
  console.log(`POST/GET /log — send request data to Telegram`);
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
