import app from './app.js';
import { config } from './config/index.js';
import { initDatabase, pool } from './config/db.js';
import { startAiSignalsWatcher } from './jobs/aiSignalsWatcher.js';
import { startTodayDigest } from './jobs/todayDigest.js';
import { startMonthlyDiscovery } from './jobs/monthlyDiscovery.js';

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
  // Opt-in: each run spends Google Places API credits.
  if (process.env.DISCOVERY_CRON_ENABLED === 'true') {
    startMonthlyDiscovery();
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

  const shutdown = (signal: string) => {
    console.log(`🛑 Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      try {
        await pool.end();
        console.log('✅ PostgreSQL connection pool closed cleanly.');
      } catch (err) {
        console.error('⚠️ Error closing PostgreSQL pool:', err);
      }
      process.exit(0);
    });

    // Force shutdown if cleanup hangs
    setTimeout(() => {
      console.error('⚠️ Forced shutdown timed out after 10s.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

