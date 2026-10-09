const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { ORIGINS } = require('./config');
const { requireAuth, can } = require('./middleware/auth');
const uploads = require('./routes/uploads');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: ORIGINS.length ? ORIGINS : true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/health', (req, res) => res.json({ ok: true, service: 'chantier360-api' }));
app.use('/uploads', express.static(uploads.ROOT));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/uploads', requireAuth, can('UPLOAD_EVIDENCE', 'MANAGE_DELIVERIES', 'MANAGE_ATTENDANCE', 'SUBMIT_REPORTS'), uploads.router);
app.use('/api/projects', requireAuth, require('./routes/projects'));
app.use('/api/sites', requireAuth, require('./routes/projects')); // older name, kept so the first mobile build keeps working
app.use('/api/materials', requireAuth, require('./routes/materials'));
app.use('/api/attendance', requireAuth, require('./routes/attendance'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/sync', requireAuth, require('./routes/sync'));
app.use('/api/alerts', requireAuth, require('./routes/alerts'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/portal', requireAuth, require('./routes/portal'));
app.use('/api', requireAuth, require('./routes/admin'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join('. ') });
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ error: 'This record already exists' });
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong on our side' : err.message });
});
module.exports = app;
