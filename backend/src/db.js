const dns = require('dns');
const mongoose = require('mongoose');
const { MONGO_URI } = require('./config');

// Connects to MongoDB Atlas. Some home and office networks refuse the DNS lookup that "mongodb+srv" addresses need
// (error: querySrv ECONNREFUSED). When that happens this retries once through public DNS servers.
// Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env to force this from the start.
async function connect() {
  const opts = { serverSelectionTimeoutMS: 15000 };
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  try { return await mongoose.connect(MONGO_URI, opts); }
  catch (e) {
    if (process.env.DNS_SERVERS || !/querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT/.test(String(e && e.message))) throw e;
    console.log('This network refused the database address lookup. Retrying through public DNS (8.8.8.8, 1.1.1.1)...');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await mongoose.disconnect().catch(() => {});
    return mongoose.connect(MONGO_URI, opts);
  }
}
module.exports = { connect };
