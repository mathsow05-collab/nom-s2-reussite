const crypto = require('crypto');

/* ------------------------------------------------------------------ */
/* Hash de mots de passe : scrypt (built-in Node, pas de dépendance). */
/* ------------------------------------------------------------------ */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 })
    .toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = String(stored).split(':');
    if (scheme !== 'scrypt') return false;
    const check = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), check);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* JWT HS256 implémenté avec crypto natif (header.payload.signature). */
/* ------------------------------------------------------------------ */
function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-a-changer';
}

function signToken(payload, ttlSeconds) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', getSecret()).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${h}.${p}`).digest();
  let given;
  try {
    given = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

/* ------------------------------------------------------------------ */
/* Générateur d'ID élève : sécurisé, non prédictible, non séquentiel. */
/* Alphabet sans caractères ambigus (pas de 0/O, 1/I/L), tirage via    */
/* crypto.randomInt + caractère de contrôle.                           */
/* ------------------------------------------------------------------ */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 caractères

function generateEleveId(prefix = 'S2') {
  let core = '';
  for (let i = 0; i < 8; i++) core += ALPHABET[crypto.randomInt(ALPHABET.length)];
  let sum = 7;
  for (const ch of core) sum = (sum * 31 + ALPHABET.indexOf(ch)) % 997;
  const check = ALPHABET[sum % ALPHABET.length];
  return `${prefix}-${core.slice(0, 4)}-${core.slice(4)}${check}`;
}

/* ------------------------------------------------------------------ */
/* Anti brute-force simple (par IP, fenêtre glissante).                */
/* ------------------------------------------------------------------ */
function rateLimiter({ max, windowMs, message }) {
  const hits = new Map();
  return function limiter(req, res, next) {
    const qui = String(req.headers.authorization || '').slice(0, 64);
    const key = `${req.ip || 'unknown'}|${qui}`;
    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || rec.reset < now) {
      rec = { count: 0, reset: now + windowMs };
      hits.set(key, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      return res.status(429).json({
        code: 'RATE_LIMIT',
        error: message || 'Trop de tentatives, réessayez dans quelques minutes.',
      });
    }
    return next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateEleveId,
  rateLimiter,
};
