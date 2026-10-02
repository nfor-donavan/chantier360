require('dotenv').config();
const required = ['MONGO_URI', 'JWT_SECRET'];
required.forEach((k) => { if (!process.env[k]) { console.error(`Missing environment variable ${k}`); process.exit(1); } });
module.exports = {
  PORT: process.env.PORT || 4000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: '7d',
  ORIGINS: (process.env.CLIENT_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  PUBLIC_URL: process.env.PUBLIC_URL || '',
  HQ_ROLES: ['executive', 'admin', 'project_manager'],
};
