const express = require('express');
const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');

const router = express.Router();

router.get('/:id', async (req, res) => {
    try {
        const mediaItem = await Media.findById(req.params.id);
        if (!mediaItem) {
            return res.status(404).json({ message: 'Media not found' });
        }

        const isVideo = mediaItem.mimeType && mediaItem.mimeType.startsWith('video/');
        const isImage = mediaItem.mimeType && mediaItem.mimeType.startsWith('image/');

        res.set('Content-Type', mediaItem.mimeType || 'application/octet-stream');
        res.set('Cache-Control', 'public, max-age=31536000');

        // If stored on local filesystem, stream from disk
        if (mediaItem.storage === 'local' && mediaItem.filename) {
            const filePath = path.join(__dirname, '..', 'uploads', 'media', mediaItem.filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Media file not found on disk' });
            }

            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            // For videos, support range requests for proper streaming
            if (isVideo && range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                if (start >= fileSize || end >= fileSize) {
                    return res.status(416).send('Requested range not satisfiable');
                }

                const chunkSize = (end - start) + 1;
                const fileStream = fs.createReadStream(filePath, { start, end });

                res.status(206);
                res.set({
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize.toString()
                });

                fileStream.pipe(res);
            } else {
                res.set('Content-Length', fileSize.toString());
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            }
        } else if (mediaItem.data) {
            // Backwards compatibility: serve from MongoDB buffer if still present
            const buffer = mediaItem.data;
            const fileSize = buffer.length;

            if (isVideo && req.headers.range) {
                const range = req.headers.range;
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunkSize = (end - start) + 1;

                res.status(206);
                res.set({
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize.toString()
                });

                res.send(buffer.slice(start, end + 1));
            } else {
                res.set('Content-Length', fileSize.toString());
                res.send(buffer);
            }
        } else {
            return res.status(404).json({ message: 'Media data not available' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
