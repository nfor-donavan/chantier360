const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PUBLIC_URL } = require('../config');
const { httpError } = require('../utils/http');

const ROOT = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => { const dir = path.join(ROOT, String(req.user.tenantId)); fs.mkdirSync(dir, { recursive: true }); cb(null, dir); },
  filename: (req, file, cb) => cb(null, crypto.randomUUID() + (path.extname(file.originalname).toLowerCase() || '.jpg')),
});
const upload = multer({ storage, limits: { fileSize: 6 * 1024 * 1024 }, fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(httpError(400, 'Only image files are accepted'))) });

// NOTE: Render's free disk is wiped on every deploy. For production, swap this for Cloudinary or S3.
router.post('/', upload.single('photo'), (req, res, next) => {
  if (!req.file) return next(httpError(400, 'Attach an image in the "photo" field'));
  const base = PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ url: `${base}/uploads/${req.user.tenantId}/${req.file.filename}` });
});
module.exports.router = router;
module.exports.ROOT = ROOT;
