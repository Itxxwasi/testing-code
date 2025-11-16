// Backup script for Media collection on LIVE database before changing storage strategy
// Usage (from backend directory):
//   node scripts/backup-media-live-before-migration.js
//
// This connects to LIVE_MONGODB_URI instead of MONGODB_URI.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Media = require('../models/Media');

const LIVE_MONGODB_URI = process.env.LIVE_MONGODB_URI;

async function main() {
  if (!LIVE_MONGODB_URI) {
    console.error('ERROR: LIVE_MONGODB_URI not set in backend .env');
    process.exit(1);
  }

  console.log('Connecting to LIVE MongoDB for media backup...');
  await mongoose.connect(LIVE_MONGODB_URI);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `media-live-backup-${timestamp}.json`);

  fs.mkdirSync(backupDir, { recursive: true });

  console.log('Fetching all Media documents from LIVE database...');
  const mediaDocs = await Media.find({}).lean();

  const serialised = mediaDocs.map((doc) => {
    if (doc.data && Buffer.isBuffer(doc.data)) {
      return {
        ...doc,
        data: doc.data.toString('base64'),
        _backupMeta: {
          hasDataBuffer: true,
          backedUpAt: new Date().toISOString(),
          source: 'live',
        },
      };
    }
    return {
      ...doc,
      _backupMeta: {
        hasDataBuffer: false,
        backedUpAt: new Date().toISOString(),
        source: 'live',
      },
    };
  });

  console.log(`Writing LIVE backup file: ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(serialised, null, 2), 'utf8');

  console.log(`LIVE backup completed. Total Media documents: ${mediaDocs.length}`);
  console.log('Keep this file safe so you can restore LIVE media if anything goes wrong.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('LIVE media backup failed:', err);
  process.exit(1);
});


