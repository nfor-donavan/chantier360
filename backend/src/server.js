const mongoose = require('mongoose');
const { PORT } = require('./config');
const { connect } = require('./db');
const app = require('./app');
require('./models');

connect()
  .then(() => { console.log('MongoDB connected'); app.listen(PORT, () => console.log(`Chantier360 API on :${PORT}`)); })
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
