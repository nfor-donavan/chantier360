const crypto = require('crypto');

// Files kept on this server are served only through expiring signed links.
// Anything returned by the API is rewritten on the way out, so only authenticated, authorised responses ever contain a usable link.
const sig = (path, exp) => crypto.createHmac('sha256', process.env.JWT_SECRET || '').update(`${path}.${exp}`).digest('hex').slice(0, 32);
function signUrl(url, ttlSec = 3600) {
  const i = url.indexOf('/media/');
  if (i < 0) return url;
  const base = url.split('?')[0], path = base.slice(i + 7), exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `${base}?exp=${exp}&sig=${sig(path, exp)}`;
}
const verify = (path, exp, s) => Number(exp) > Date.now() / 1000 && typeof s === 'string' && s.length === 32 && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sig(path, exp)));
function signDeep(v) {
  if (typeof v === 'string') return v.includes('/media/') && /^https?:\/\//.test(v) ? signUrl(v) : v;
  if (Array.isArray(v)) return v.map(signDeep);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = signDeep(v[k]); return o; }
  return v;
}
const signer = (req, res, next) => { const orig = res.json.bind(res); res.json = (b) => orig(signDeep(JSON.parse(JSON.stringify(b ?? null)))); next(); };
module.exports = { signUrl, verify, signer };
