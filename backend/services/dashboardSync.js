const HomepageSection = require('../models/HomepageSection');
const Slider = require('../models/Slider');

async function updateHeroSectionWithActiveSliders() {
    try {
        const activeSliders = await Slider.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).select('_id');
        const sliderIds = activeSliders.map(slider => slider._id);

        const heroSection = await HomepageSection.findOne({ type: 'heroSlider' });
        if (!heroSection) {
            return;
        }

        heroSection.config = {
            ...(heroSection.config || {}),
            sliderIds
        };

        await heroSection.save();
    } catch (error) {
        console.error('Failed to update hero section with sliders', error);
    }
}

module.exports = {
    updateHeroSectionWithActiveSliders
};

