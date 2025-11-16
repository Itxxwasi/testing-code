const express = require('express');
const router = express.Router();
const Slider = require('../models/Slider');
const Media = require('../models/Media');
const { updateHeroSectionWithActiveSliders } = require('../services/dashboardSync');
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

// Get all active sliders
router.get('/', async (req, res) => {
    try {
        const sliders = await Slider.find({ isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .populate('imageUpload');
        res.json(sliders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get slider by ID
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const slider = await Slider.findById(req.params.id).populate('imageUpload');
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }
        res.json(slider);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new slider (admin only)
router.post('/', adminAuth, async (req, res) => {
    const slider = new Slider({
        title: req.body.title,
        description: req.body.description,
        image: req.body.image,
        link: req.body.link,
        order: req.body.order || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    try {
        await assignImageFields(slider, req.body);
        const newSlider = await slider.save();
        const populatedSlider = await Slider.findById(newSlider._id).populate('imageUpload');

        updateHeroSectionWithActiveSliders().catch(error => {
            console.error('Failed to sync hero section after slider create', error);
        });

        res.status(201).json(populatedSlider);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Update a slider (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const slider = await Slider.findById(req.params.id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        slider.title = req.body.title || slider.title;
        slider.description = req.body.description || slider.description;
        slider.link = req.body.link || slider.link;
        slider.order = req.body.order !== undefined ? req.body.order : slider.order;
        slider.isActive = req.body.isActive !== undefined ? req.body.isActive : slider.isActive;

        await assignImageFields(slider, req.body);

        await slider.save();
        const populatedSlider = await Slider.findById(slider._id).populate('imageUpload');

        updateHeroSectionWithActiveSliders().catch(error => {
            console.error('Failed to sync hero section after slider update', error);
        });

        res.json(populatedSlider);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Delete a slider (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const slider = await Slider.findById(req.params.id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        await slider.deleteOne();

        // Sync hero section with active sliders (uses HomepageSection model now)
        updateHeroSectionWithActiveSliders().catch(error => {
            console.error('Failed to sync hero section after slider delete', error);
        });

        res.json({ message: 'Slider deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
