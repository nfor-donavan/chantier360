const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PUBLIC_URL } = require('../config');
const { httpError, wrap } = require('../utils/http');

const ROOT = path.join(__dirname, '..', '..', 'uploads');
const { CLOUDINARY_CLOUD_NAME: CLOUD, CLOUDINARY_API_KEY: KEY, CLOUDINARY_API_SECRET: SECRET } = process.env;
const useCloud = !!(CLOUD && KEY && SECRET);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(httpError(400, 'Only image files are accepted'))) });

// With Cloudinary credentials set, photos are stored permanently there.
// Without them, photos go to the server disk, which Render wipes on every deploy.
async function toCloudinary(file, tenantId) {
  const timestamp = Math.floor(Date.now() / 1000), folder = `chantier360/${tenantId}`;
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${SECRET}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'photo.jpg');
  Object.entries({ api_key: KEY, timestamp, folder, signature }).forEach(([k, v]) => form.append(k, String(v)));
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok) throw httpError(502, 'Photo storage failed: ' + (j.error?.message || r.status));
  return j.secure_url;
}

router.post('/', upload.single('photo'), wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Attach an image in the "photo" field');
  if (useCloud) return res.status(201).json({ url: await toCloudinary(req.file, req.user.tenantId) });
  const dir = path.join(ROOT, String(req.user.tenantId)); fs.mkdirSync(dir, { recursive: true });
  const name = crypto.randomUUID() + (path.extname(req.file.originalname || '').toLowerCase() || '.jpg');
  fs.writeFileSync(path.join(dir, name), req.file.buffer);
  res.status(201).json({ url: `${PUBLIC_URL || `${req.protocol}://${req.get('host')}`}/uploads/${req.user.tenantId}/${name}` });
}));
module.exports.router = router;
module.exports.ROOT = ROOT;
