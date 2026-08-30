import app from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './config/db.js';

const PORT = config.port;

const startServer = async () => {
  // Initialize PostgreSQL schema and seed data
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/login & /register`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
