const { setupEnv } = require('./scripts/setup-env');
setupEnv(__dirname);
const { connectDatabase } = require('./src/db/database');
const { createApp } = require('./src/app');

async function main() {
  console.log('Starting MongoDB and Pitchside…');
  const database = await connectDatabase();
  const app = createApp(database);
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`\nPitchside is ready: http://localhost:${port}\nDatabase: ${database.mode} (persistent)\nPress Ctrl+C to stop.\n`);
  });
  server.on('error', async error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the old server with Ctrl+C, then run npm start again.` : error.message);
    await database.close();
    process.exitCode = 1;
  });
  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    server.close(async () => { await database.close(); process.exit(0); });
    server.closeIdleConnections();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
main().catch(error => { console.error('Could not start:', error.message); process.exitCode = 1; });
