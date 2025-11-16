const mongoose = require('mongoose');

/**
 * VideoBanner Model
 * Stores video banners for homepage sections
 */
const VideoBannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    // Video URL (YouTube, Vimeo, or direct video file URL)
    videoUrl: {
        type: String,
        trim: true
    },
    // Video file upload (for hosted videos)
    videoUpload: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    },
    // Fallback poster image (shown before video plays)
    posterImage: {
        type: String,
        trim: true
    },
    posterImageUpload: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    },
    // Video type: 'youtube', 'vimeo', 'direct', 'file'
    videoType: {
        type: String,
        enum: ['youtube', 'vimeo', 'direct', 'file'],
        default: 'youtube'
    },
    // Autoplay video
    autoplay: {
        type: Boolean,
        default: true
    },
    // Loop video
    loop: {
        type: Boolean,
        default: true
    },
    // Mute video (required for autoplay in most browsers)
    muted: {
        type: Boolean,
        default: true
    },
    // Show controls
    controls: {
        type: Boolean,
        default: false
    },
    // Link when video/poster is clicked
    link: {
        type: String,
        trim: true
    },
    // Call to action button text
    buttonText: {
        type: String,
        trim: true
    },
    // Call to action button link
    buttonLink: {
        type: String,
        trim: true
    },
    // Display order
    order: {
        type: Number,
        default: 0
    },
    // Active status
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt before saving
VideoBannerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('VideoBanner', VideoBannerSchema);
