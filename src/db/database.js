const fs = require('node:fs/promises');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server-core');

async function connectDatabase(options = {}) {
  const root = path.resolve(__dirname, '../..');
  let localServer;
  let client;
  let localMode = false;
  let uri = options.uri || process.env.MONGODB_URI;
  const dbName = options.dbName || process.env.MONGODB_DB || 'codebox_tasks';
  try {
    if (!uri) {
      localMode = true;
      const dbPath = options.dbPath || path.join(root, '.data/mongodb');
      await fs.mkdir(dbPath, { recursive: true });
      const username = process.env.LOCAL_MONGO_USER;
      const password = process.env.LOCAL_MONGO_PASSWORD;
      if (!username || !password) throw new Error('Local MongoDB credentials are missing. Run npm start.');
      const port = options.port ?? Number(process.env.LOCAL_MONGO_PORT || 27018);
      const buildUri = targetPort => `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@127.0.0.1:${targetPort}/${dbName}?authSource=admin`;
      // Reuse a previously started local MongoDB after an interrupted app run.
      if (port) {
        const probe = new MongoClient(buildUri(port), { serverSelectionTimeoutMS: 500 });
        try { await probe.connect(); await probe.db(dbName).command({ ping: 1 }); uri = buildUri(port); }
        catch (error) { if (error.code === 18) throw new Error('Local MongoDB credentials do not match .env. Restore the original credentials.'); }
        finally { await probe.close(); }
      }
      if (!uri) {
        localServer = await MongoMemoryServer.create({
          binary: { version: '8.0.17', downloadDir: path.join(root, '.cache/mongodb-binaries') },
          instance: { ip: '127.0.0.1', port, dbPath, storageEngine: 'wiredTiger', args: ['--wiredTigerCacheSizeGB', '0.25'] },
          auth: { enable: true, customRootName: username, customRootPwd: password },
        });
        uri = buildUri(localServer.instanceInfo.port);
      }
    }
    client = new MongoClient(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const db = client.db(dbName);
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('trainingSessions').createIndex({ userId: 1, createdAt: -1 }),
      db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return {
      db, mode: localMode ? 'local MongoDB' : 'MongoDB',
      async close() {
        await client.close();
        // Keep WiredTiger files so accounts and tasks survive restarts.
        if (localServer) await localServer.stop({ doCleanup: false });
      },
    };
  } catch (error) {
    if (client) await client.close();
    if (localServer) await localServer.stop({ doCleanup: false });
    throw error;
  }
}
module.exports = { connectDatabase };
