const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PUBLIC_URL } = require('../config');
const { verify } = require('../services/media');
const { httpError, wrap } = require('../utils/http');

const ROOT = path.join(__dirname, '..', '..', 'uploads');
const { CLOUDINARY_CLOUD_NAME: CLOUD, CLOUDINARY_API_KEY: KEY, CLOUDINARY_API_SECRET: SECRET } = process.env;
const useCloud = !!(CLOUD && KEY && SECRET);
const IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'];
const MAX_PHOTO = 8 * 1024 * 1024, MAX_VIDEO = 60 * 1024 * 1024;

const photo = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_PHOTO }, fileFilter: (req, f, cb) => (IMAGE.includes(f.mimetype) ? cb(null, true) : cb(httpError(400, 'Photos must be JPG, PNG, WebP or HEIC'))) });
const tmp = path.join(require('os').tmpdir(), 'c360-video'); fs.mkdirSync(tmp, { recursive: true });
const video = multer({ storage: multer.diskStorage({ destination: tmp, filename: (r, f, cb) => cb(null, crypto.randomUUID()) }), limits: { fileSize: MAX_VIDEO }, fileFilter: (req, f, cb) => (VIDEO.includes(f.mimetype) ? cb(null, true) : cb(httpError(400, 'Videos must be MP4, MOV, WebM or 3GP'))) });

async function toCloudinary(buffer, mime, name, tenantId, resource) {
  const timestamp = Math.floor(Date.now() / 1000), folder = `chantier360/${tenantId}`;
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${SECRET}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime }), name || 'file');
  Object.entries({ api_key: KEY, timestamp, folder, signature }).forEach(([k, v]) => form.append(k, String(v)));
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resource}/upload`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok) throw httpError(502, 'File storage failed: ' + (j.error?.message || r.status));
  return j.secure_url;
}
const base = (req) => PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
function saveLocal(req, buffer, ext) {
  const dir = path.join(ROOT, String(req.user.tenantId)); fs.mkdirSync(dir, { recursive: true });
  const name = crypto.randomUUID() + ext; fs.writeFileSync(path.join(dir, name), buffer);
  return `${base(req)}/media/${req.user.tenantId}/${name}`;
}

// With Cloudinary credentials the files are stored permanently there. Without them they go to this server's disk (wiped on every Render deploy).
router.post('/', photo.single('photo'), wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Attach an image in the "photo" field');
  const f = req.file;
  const url = useCloud ? await toCloudinary(f.buffer, f.mimetype, f.originalname, req.user.tenantId, 'image') : saveLocal(req, f.buffer, path.extname(f.originalname || '').toLowerCase() || '.jpg');
  res.status(201).json({ url, kind: 'photo', mime: f.mimetype, size: f.size });
}));
router.post('/video', video.single('video'), wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Attach a video in the "video" field');
  const f = req.file;
  try {
    const buffer = fs.readFileSync(f.path);
    const url = useCloud ? await toCloudinary(buffer, f.mimetype, f.originalname, req.user.tenantId, 'video') : saveLocal(req, buffer, path.extname(f.originalname || '').toLowerCase() || '.mp4');
    res.status(201).json({ url, kind: 'video', mime: f.mimetype, size: f.size });
  } finally { fs.rm(f.path, () => {}); }
}));
module.exports.router = router;
module.exports.ROOT = ROOT;
module.exports.limits = { MAX_PHOTO, MAX_VIDEO };

// Files held on this server are served only through short-lived signed links (see services/media.js).
module.exports.serve = (req, res, next) => {
  const rel = `${req.params.tenant}/${req.params.file}`;
  if (!verify(rel, req.query.exp, req.query.sig)) return next(httpError(403, 'This link has expired. Reload the page.'));
  const file = path.join(ROOT, req.params.tenant, path.basename(req.params.file));
  res.sendFile(file, (err) => { if (err) next(httpError(404, 'File not found')); });
};
