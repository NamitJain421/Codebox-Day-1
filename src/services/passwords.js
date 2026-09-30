const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  const hash = await scrypt(password, salt, 64);
  const buffer = Buffer.from(expected, 'hex');
  return buffer.length === hash.length && timingSafeEqual(buffer, hash);
}
module.exports = { hashPassword, verifyPassword };
