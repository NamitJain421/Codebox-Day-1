const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const dotenv = require('dotenv');

function setupEnv(root) {
  const filename = path.join(root, '.env');
  const existing = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  const values = dotenv.parse(existing);
  const defaults = {
    PORT: '3000',
    HOST: '127.0.0.1',
    MONGODB_DB: 'codebox_tasks',
    LOCAL_MONGO_PORT: '27018',
    LOCAL_MONGO_USER: 'codebox_admin',
    LOCAL_MONGO_PASSWORD: randomBytes(32).toString('hex'),
  };
  const additions = Object.entries(defaults)
    .filter(([key]) => !values[key] && !process.env[key])
    .map(([key, value]) => `${key}=${value}`);
  if (additions.length) fs.appendFileSync(filename, `\n${additions.join('\n')}\n`, { mode: 0o600 });
  if ((fs.statSync(filename).mode & 0o777) !== 0o600) fs.chmodSync(filename, 0o600);
  dotenv.config({ path: filename, quiet: true });
}
module.exports = { setupEnv };
