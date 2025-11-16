const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const adminAuth = require('../middleware/adminAuth');
const Media = require('../models/Media');

const router = express.Router();

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.avi', '.mkv', '.flv', '.wmv']);
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'media');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Store files on disk instead of in MongoDB
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// Default max upload size: 50MB for images, 500MB for videos
const MAX_UPLOAD_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || 500 * 1024 * 1024, 10); // 500MB default
const MAX_IMAGE_SIZE = parseInt(process.env.UPLOAD_MAX_IMAGE_SIZE || 20 * 1024 * 1024, 10); // 20MB for images (increased from 5MB)
const MAX_VIDEO_SIZE = parseInt(process.env.UPLOAD_MAX_VIDEO_SIZE || 500 * 1024 * 1024, 10); // 500MB for videos

const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_SIZE }, // Use MAX_UPLOAD_SIZE for multer, but we check MAX_IMAGE_SIZE separately
    fileFilter: (req, file, cb) => {
        const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
        const isVideoMime = file.mimetype && file.mimetype.startsWith('video/');
        const ext = path.extname(file.originalname || '').toLowerCase();
        
        if (!isImageMime && !isVideoMime && !ALLOWED_EXTENSIONS.has(ext)) {
            return cb(new Error('Only image and video uploads are allowed'));
        }
        
        // File size checks are done after multer processes the file
        cb(null, true);
    }
});

router.get('/', adminAuth, async (req, res) => {
    try {
        const mediaItems = await Media.find().sort({ createdAt: -1 }).select('-data');
        res.json(mediaItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Handle multer errors (file size, file filter, etc.)
router.post('/', adminAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        message: `File size exceeds maximum limit of ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB` 
                    });
                }
                return res.status(400).json({ message: `File upload error: ${err.message}` });
            }
            if (err.message === 'Only image and video uploads are allowed' || err.message.includes('file size exceeds maximum limit')) {
                return res.status(400).json({ message: err.message });
            }
            return res.status(500).json({ message: `Upload error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const isImage = req.file.mimetype && req.file.mimetype.startsWith('image/');
        const isVideo = req.file.mimetype && req.file.mimetype.startsWith('video/');
        const fileType = isImage ? 'image' : (isVideo ? 'video' : 'unknown');
        
        // Check file size based on type
        if (isImage && req.file.size > MAX_IMAGE_SIZE) {
            return res.status(400).json({ 
                message: `Image file size exceeds maximum limit of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` 
            });
        }
        
        if (isVideo && req.file.size > MAX_VIDEO_SIZE) {
            return res.status(400).json({ 
                message: `Video file size exceeds maximum limit of ${MAX_VIDEO_SIZE / (1024 * 1024)}MB` 
            });
        }
        
        console.log('Media upload request received:', {
            originalName: req.file.originalname,
            storedFilename: req.file.filename,
            mimeType: req.file.mimetype,
            fileType: fileType,
            size: req.file.size,
            sizeMB: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
            folder: req.body?.folder || 'default',
            userId: req.user?.id
        });

        const mediaItem = new Media({
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimeType: req.file.mimetype,
            size: req.file.size,
            storage: 'local',
            metadata: {
                folder: req.body?.folder || 'default'
            },
            uploadedBy: req.user ? req.user.id : undefined
        });

        mediaItem.url = `/api/media/${mediaItem._id}`;
        
        console.log('Saving media item to database...');
        await mediaItem.save();
        console.log('Media item saved successfully:', mediaItem._id);

        res.status(201).json({
            _id: mediaItem._id,
            originalName: mediaItem.originalName,
            mimeType: mediaItem.mimeType,
            size: mediaItem.size,
            url: mediaItem.url,
            storage: mediaItem.storage,
            metadata: mediaItem.metadata,
            uploadedBy: mediaItem.uploadedBy,
            createdAt: mediaItem.createdAt
        });
    } catch (error) {
        console.error('Media upload failed:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });
        
        let errorMessage = 'Error uploading media file';
        if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({ 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const mediaItem = await Media.findById(req.params.id);
        if (!mediaItem) {
            return res.status(404).json({ message: 'Media not found' });
        }

        await mediaItem.deleteOne();

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
