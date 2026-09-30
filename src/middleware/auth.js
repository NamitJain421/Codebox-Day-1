const { createHash, randomBytes } = require('node:crypto');
const cookieName = 'codebox_session';
const lifetime = 7 * 24 * 60 * 60 * 1000;
const digest = token => createHash('sha256').update(token).digest('hex');
const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });

function sessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  const value = cookie?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
async function createSession(db, res, userId) {
  const token = randomBytes(32).toString('hex');
  await db.collection('sessions').insertOne({ _id: digest(token), userId, expiresAt: new Date(Date.now() + lifetime) });
  res.cookie(cookieName, token, { ...cookieOptions(), maxAge: lifetime });
}
async function revokeSession(db, req, res) {
  const token = sessionToken(req);
  if (token) await db.collection('sessions').deleteOne({ _id: digest(token) });
  res.clearCookie(cookieName, cookieOptions());
}
function requireAuth(db) {
  return async (req, res, next) => {
    const token = sessionToken(req);
    const session = token && await db.collection('sessions').findOne({ _id: digest(token), expiresAt: { $gt: new Date() } });
    if (!session) return res.status(401).json({ error: 'Please sign in to continue.' });
    const user = await db.collection('users').findOne({ _id: session.userId }, { projection: { passwordHash: 0 } });
    if (!user) return res.status(401).json({ error: 'Please sign in again.' });
    req.user = user;
    next();
  };
}
module.exports = { createSession, revokeSession, requireAuth };
