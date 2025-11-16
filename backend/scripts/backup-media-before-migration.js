// Backup script for Media collection before changing storage strategy
// Usage (from backend directory):
//   node scripts/backup-media-before-migration.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Media = require('../models/Media');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI or MONGO_URI not set in backend .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB for media backup...');
  await mongoose.connect(MONGODB_URI);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `media-backup-${timestamp}.json`);

  fs.mkdirSync(backupDir, { recursive: true });

  console.log('Fetching all Media documents...');
  const mediaDocs = await Media.find({}).lean();

  // Convert Buffer fields to base64 strings so they can be safely written to JSON
  const serialised = mediaDocs.map((doc) => {
    if (doc.data && Buffer.isBuffer(doc.data)) {
      return {
        ...doc,
        data: doc.data.toString('base64'),
        _backupMeta: {
          hasDataBuffer: true,
          backedUpAt: new Date().toISOString(),
        },
      };
    }
    return {
      ...doc,
      _backupMeta: {
        hasDataBuffer: false,
        backedUpAt: new Date().toISOString(),
      },
    };
  });

  console.log(`Writing backup file: ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(serialised, null, 2), 'utf8');

  console.log(`Backup completed. Total Media documents: ${mediaDocs.length}`);
  console.log('Keep this file safe so you can restore if anything goes wrong.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Media backup failed:', err);
  process.exit(1);
});


