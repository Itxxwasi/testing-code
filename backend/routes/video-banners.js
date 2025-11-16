const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const VideoBanner = require('../models/VideoBanner');
const Media = require('../models/Media');

// Helper function to assign media fields
async function assignMediaFields(target, body, fieldName) {
    const urlField = fieldName === 'video' ? 'videoUrl' : 'posterImage';
    const uploadField = fieldName === 'video' ? 'videoUpload' : 'posterImageUpload';
    const fileIdField = fieldName === 'video' ? 'videoFileId' : 'posterImageFileId';

    const providedUrl = body[urlField];
    if (providedUrl !== undefined && providedUrl !== null && providedUrl !== '') {
        target[urlField] = providedUrl.trim();
    }

    const fileId = body[fileIdField];
    if (fileId && fileId !== 'null' && fileId !== 'undefined' && fileId !== '') {
        try {
            const media = await Media.findById(fileId);
            if (!media) {
                const error = new Error(`Invalid ${fieldName} file reference`);
                error.statusCode = 400;
                throw error;
            }
            target[uploadField] = media._id;
            if (!target[urlField]) {
                target[urlField] = media.url;
            }
        } catch (mediaError) {
            if (mediaError.statusCode) {
                throw mediaError;
            }
            const error = new Error(`Error loading ${fieldName} file: ${mediaError.message || 'Invalid file reference'}`);
            error.statusCode = 400;
            throw error;
        }
    } else if (fileId === '' || fileId === null || fileId === 'null' || fileId === 'undefined') {
        target[uploadField] = undefined;
    }
}

// Helper to detect video type from URL
function detectVideoType(url) {
    if (!url) return 'direct';
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/embed')) {
        return 'youtube';
    }
    if (url.includes('vimeo.com/')) {
        return 'vimeo';
    }
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return 'direct';
    }
    return 'file';
}

// Helper to extract YouTube video ID
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Helper to extract Vimeo video ID
function extractVimeoId(url) {
    const match = url.match(/vimeo.com\/(\d+)/);
    return match ? match[1] : null;
}

// Get all video banners (admin)
router.get('/', adminAuth, async (req, res) => {
    try {
        console.log('📥 Admin video banners API called - /api/admin/video-banners');
        console.log('   User ID:', req.user?.id);
        console.log('   User Role:', req.user?.role);
        
        const videoBanners = await VideoBanner.find()
            .populate('videoUpload', 'url originalName mimeType')
            .populate('posterImageUpload', 'url originalName mimeType')
            .sort({ order: 1, createdAt: -1 });
        
        // Ensure video URLs are set from uploads if missing
        videoBanners.forEach(banner => {
            if (banner.videoUpload && banner.videoUpload.url && !banner.videoUrl) {
                banner.videoUrl = banner.videoUpload.url;
            }
            if (banner.posterImageUpload && banner.posterImageUpload.url && !banner.posterImage) {
                banner.posterImage = banner.posterImageUpload.url;
            }
        });
        
        console.log(`   ✅ Fetched ${videoBanners.length} video banners from database`);
        videoBanners.forEach(banner => {
            console.log(`      - ${banner.title}: videoUrl="${banner.videoUrl || 'NO'}", active=${banner.isActive}`);
        });
        
        res.json(videoBanners);
    } catch (error) {
        console.error('❌ Error fetching video banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all active video banners (public) - must be before /:id to avoid conflict
router.get('/public', async (req, res) => {
    try {
        console.log('📥 Public video banners API called - /api/video-banners/public');
        
        const videoBanners = await VideoBanner.find({ isActive: true })
            .populate('videoUpload', 'url originalName mimeType')
            .populate('posterImageUpload', 'url originalName mimeType')
            .sort({ order: 1, createdAt: -1 });
        
        // Ensure video URLs are set from uploads if missing
        videoBanners.forEach(banner => {
            if (banner.videoUpload && banner.videoUpload.url && !banner.videoUrl) {
                banner.videoUrl = banner.videoUpload.url;
            }
            if (banner.posterImageUpload && banner.posterImageUpload.url && !banner.posterImage) {
                banner.posterImage = banner.posterImageUpload.url;
            }
        });
        
        console.log(`   ✅ Fetched ${videoBanners.length} active video banners from database`);
        videoBanners.forEach(banner => {
            console.log(`      - ${banner.title}: videoUrl="${banner.videoUrl || 'NO'}", active=${banner.isActive}`);
        });
        
        res.json(videoBanners);
    } catch (error) {
        console.error('❌ Error fetching public video banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single video banner by ID (admin only)
router.get('/:id', adminAuth, async (req, res) => {
    try {
        // Check if 'public' was passed as ID (shouldn't happen but handle gracefully)
        if (req.params.id === 'public') {
            return res.status(404).json({ message: 'Video banner not found' });
        }
        
        const videoBanner = await VideoBanner.findById(req.params.id)
            .populate('videoUpload', 'url originalName mimeType')
            .populate('posterImageUpload', 'url originalName mimeType');
        
        if (!videoBanner) {
            return res.status(404).json({ message: 'Video banner not found' });
        }
        res.json(videoBanner);
    } catch (error) {
        console.error('Error fetching video banner:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create video banner
router.post('/', adminAuth, async (req, res) => {
    try {
        const {
            title,
            description,
            videoUrl,
            videoFileId,
            posterImage,
            posterImageFileId,
            videoType,
            autoplay,
            loop,
            muted,
            controls,
            link,
            buttonText,
            buttonLink,
            order,
            isActive
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        if (!videoUrl && !videoFileId) {
            return res.status(400).json({ message: 'Video URL or video file is required' });
        }

        const detectedType = videoUrl ? detectVideoType(videoUrl) : (videoType || 'file');

        const videoBanner = new VideoBanner({
            title: title.trim(),
            description: description ? description.trim() : undefined,
            videoType: detectedType,
            autoplay: autoplay !== undefined ? autoplay : true,
            loop: loop !== undefined ? loop : true,
            muted: muted !== undefined ? muted : true,
            controls: controls !== undefined ? controls : false,
            link: link ? link.trim() : undefined,
            buttonText: buttonText ? buttonText.trim() : undefined,
            buttonLink: buttonLink ? buttonLink.trim() : undefined,
            order: order !== undefined ? parseInt(order, 10) : 0,
            isActive: isActive !== undefined ? isActive : true
        });

        // Assign video fields
        await assignMediaFields(videoBanner, req.body, 'video');

        // Assign poster image fields
        if (posterImage || posterImageFileId) {
            await assignMediaFields(videoBanner, req.body, 'poster');
        }

        if (!videoBanner.videoUrl) {
            return res.status(400).json({ message: 'Video URL is required and was not set correctly' });
        }

        await videoBanner.save();
        
        await videoBanner.populate('videoUpload', 'url originalName mimeType');
        await videoBanner.populate('posterImageUpload', 'url originalName mimeType');
        
        res.status(201).json(videoBanner);
    } catch (error) {
        console.error('Error creating video banner:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update video banner
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const videoBanner = await VideoBanner.findById(req.params.id);
        if (!videoBanner) {
            return res.status(404).json({ message: 'Video banner not found' });
        }

        const {
            title,
            description,
            videoUrl,
            videoFileId,
            posterImage,
            posterImageFileId,
            videoType,
            autoplay,
            loop,
            muted,
            controls,
            link,
            buttonText,
            buttonLink,
            order,
            isActive
        } = req.body;

        if (title !== undefined) {
            if (!title || !title.trim()) {
                return res.status(400).json({ message: 'Title is required' });
            }
            videoBanner.title = title.trim();
        }

        if (description !== undefined) {
            videoBanner.description = description ? description.trim() : undefined;
        }

        if (videoUrl || videoFileId) {
            await assignMediaFields(videoBanner, req.body, 'video');
            const detectedType = videoBanner.videoUrl ? detectVideoType(videoBanner.videoUrl) : (videoType || videoBanner.videoType);
            videoBanner.videoType = detectedType;
        }

        if (videoType !== undefined && !videoUrl && !videoFileId) {
            videoBanner.videoType = videoType;
        }

        if (posterImage || posterImageFileId) {
            await assignMediaFields(videoBanner, req.body, 'poster');
        }

        if (autoplay !== undefined) videoBanner.autoplay = autoplay;
        if (loop !== undefined) videoBanner.loop = loop;
        if (muted !== undefined) videoBanner.muted = muted;
        if (controls !== undefined) videoBanner.controls = controls;
        if (link !== undefined) videoBanner.link = link ? link.trim() : undefined;
        if (buttonText !== undefined) videoBanner.buttonText = buttonText ? buttonText.trim() : undefined;
        if (buttonLink !== undefined) videoBanner.buttonLink = buttonLink ? buttonLink.trim() : undefined;
        if (order !== undefined) videoBanner.order = parseInt(order, 10);
        if (isActive !== undefined) videoBanner.isActive = isActive;

        await videoBanner.save();
        
        await videoBanner.populate('videoUpload', 'url originalName mimeType');
        await videoBanner.populate('posterImageUpload', 'url originalName mimeType');
        
        res.json(videoBanner);
    } catch (error) {
        console.error('Error updating video banner:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
});

// Delete video banner
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const videoBanner = await VideoBanner.findById(req.params.id);
        if (!videoBanner) {
            return res.status(404).json({ message: 'Video banner not found' });
        }

        await videoBanner.deleteOne();
        res.json({ message: 'Video banner deleted successfully' });
    } catch (error) {
        console.error('Error deleting video banner:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
