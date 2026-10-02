const mongoose = require('mongoose');
const { MONGO_URI, PORT } = require('./config');
const app = require('./app');
require('./models');

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => { console.log('MongoDB connected'); app.listen(PORT, () => console.log(`Chantier360 API on :${PORT}`)); })
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
