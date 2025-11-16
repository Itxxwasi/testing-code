const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const Media = require('../models/Media');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

async function assignImageFields(target, body) {
    const providedUrl = body.image;
    if (providedUrl !== undefined) {
        target.image = providedUrl;
    }

    const fileId = body.imageFileId;
    if (fileId && fileId !== 'null' && fileId !== 'undefined') {
        const media = await Media.findById(fileId);
        if (!media) {
            const error = new Error('Invalid image file reference');
            error.statusCode = 400;
            throw error;
        }
        target.imageUpload = media._id;
        if (!target.image) {
            target.image = media.url;
        }
    } else if (fileId === '' || fileId === null) {
        target.imageUpload = undefined;
    }
}

// Get all active banners
router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true })
            .select('title description image imageUpload link position size isActive')
            .populate('imageUpload', 'url')
            .sort({ createdAt: -1 })
            .lean(); // Faster queries
        
        // Add aggressive cache headers
        res.set({
            'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
            'Vary': 'Accept-Encoding'
        });
        res.json(banners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get banner by ID (public route for homepage sections)
router.get('/detail/:id', async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id).populate('imageUpload');
        if (!banner || !banner.isActive) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json(banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get banner by position
router.get('/:position', async (req, res) => {
    try {
        const banner = await Banner.findOne({
            position: req.params.position,
            isActive: true
        }).populate('imageUpload');

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json(banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new banner (admin only)
router.post('/', adminAuth, async (req, res) => {
    const banner = new Banner({
        title: req.body.title,
        description: req.body.description,
        image: req.body.image,
        link: req.body.link,
        position: req.body.position || 'middle',
        size: req.body.size || 'medium',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    try {
        await assignImageFields(banner, req.body);
        const newBanner = await banner.save();
        const populatedBanner = await Banner.findById(newBanner._id).populate('imageUpload');
        res.status(201).json(populatedBanner);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Update a banner (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        banner.title = req.body.title || banner.title;
        banner.description = req.body.description || banner.description;
        banner.link = req.body.link || banner.link;
        banner.position = req.body.position || banner.position;
        banner.size = req.body.size || banner.size || 'medium';
        banner.isActive = req.body.isActive !== undefined ? req.body.isActive : banner.isActive;

        await assignImageFields(banner, req.body);

        await banner.save();
        const populatedBanner = await Banner.findById(banner._id).populate('imageUpload');

        // Note: Banner position updates are now handled via HomepageSection model
        // Top banners can be manually added to homepage sections in admin dashboard

        res.json(populatedBanner);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Delete a banner (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        const position = banner.position;
        const image = banner.image;

        // Actually delete the banner from database
        await banner.deleteOne();

        // Note: Banner position updates are now handled via HomepageSection model
        // Top banners can be manually managed in homepage sections in admin dashboard

        res.json({ message: 'Banner deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;