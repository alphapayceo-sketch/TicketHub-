require('dotenv').config();
const path = require('path');

try {
  const admin = require(path.resolve(__dirname, '..', 'src', 'config', 'firebase'));
  console.log('Firebase admin loaded. apps length =', (admin && admin.apps) ? admin.apps.length : 'no-admin.apps');
} catch (err) {
  console.error('Failed to load firebase config:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}
