const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        trim: true
    },
    imageAlt: {
        type: String,
        trim: true
    },
    imageUpload: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    },
    link: {
        type: String,
        required: true
    },
    position: {
        type: String,
        enum: [
            'top',              // Top of page (after hero slider)
            'after-hero',       // Immediately after hero slider
            'after-categories', // After category sections
            'middle',           // Between product sections (default middle)
            'after-trending',   // After trending products section
            'after-discounted', // After discounted products section
            'after-new-arrival',// After new arrival products section
            'before-footer',   // Before footer section
            'bottom'            // Bottom of page
        ],
        required: true,
        default: 'middle'
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large', 'full-width'],
        default: 'medium'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Banner', BannerSchema);