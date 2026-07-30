import 'dotenv/config';
import app from './app.js';
import { pool, testDb } from './config/db.js';
import { startReminderJob } from './jobs/reminders.js';

const port = Number(process.env.PORT || 5000);
let reminderTask;

try {
  await testDb();
  reminderTask = startReminderJob();

  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(port, host, () => {
    console.log(`API running on http://${host}:${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    reminderTask?.stop?.();
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
} catch (error) {
  console.error('Server startup failed:', error.message);
  await pool.end().catch(() => undefined);
  process.exit(1);
}
