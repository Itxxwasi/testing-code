// One-time migration script for LIVE database:
// Moves media binary data from LIVE MongoDB to local filesystem (backend/uploads/media)
// and updates Media documents to use local storage (no data buffer).
//
// Usage (from backend directory):
//   node scripts/migrate-media-live-to-local-files.js
//
// NOTE: This connects to LIVE_MONGODB_URI directly.

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

  console.log('Connecting to LIVE MongoDB for media migration...');
  await mongoose.connect(LIVE_MONGODB_URI);

  const uploadDir = path.join(__dirname, '..', 'uploads', 'media');
  fs.mkdirSync(uploadDir, { recursive: true });

  // Find media items that still have data buffer present
  const cursor = Media.find({ data: { $exists: true, $ne: null } }).cursor();

  let migrated = 0;
  for (let media = await cursor.next(); media != null; media = await cursor.next()) {
    try {
      if (!media.data || !Buffer.isBuffer(media.data)) {
        continue;
      }

      const originalName = media.originalName || `file-${media._id}`;
      const ext = path.extname(originalName) || '';
      const filename = `${media._id}${ext}`;
      const filePath = path.join(uploadDir, filename);

      fs.writeFileSync(filePath, media.data);

      media.filename = filename;
      media.url = `/api/media/${media._id}`;
      media.storage = 'local';
      media.data = undefined;

      await media.save();
      migrated++;
      console.log(`[LIVE] Migrated media ${media._id} -> ${filePath}`);
    } catch (err) {
      console.error(`[LIVE] Failed to migrate media ${media._id}:`, err);
    }
  }

  console.log(`[LIVE] Done. Migrated ${migrated} media items.`);
  console.log('[LIVE] LIVE MongoDB should now be lighter because binary data was removed.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[LIVE] Media migration failed:', err);
  process.exit(1);
});


