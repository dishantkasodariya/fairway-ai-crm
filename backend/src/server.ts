import app from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './config/db.js';
import { startAiSignalsWatcher } from './jobs/aiSignalsWatcher.js';
import { startTodayDigest } from './jobs/todayDigest.js';

const PORT = config.port;

const startServer = async () => {
  // Initialize PostgreSQL schema and seed data
  await initDatabase();

  if (process.env.AI_SIGNALS_WATCHER_ENABLED !== 'false') {
    startAiSignalsWatcher();
  }
  if (process.env.TODAY_DIGEST_ENABLED !== 'false') {
    startTodayDigest();
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/login & /register`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Port ${PORT} is already in use. Please terminate the conflicting process or change PORT in .env.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
