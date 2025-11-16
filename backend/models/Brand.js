const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    imageUpload: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    },
    alt: {
        type: String,
        trim: true
    },
    link: {
        type: String,
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
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

BrandSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (!this.alt) {
        this.alt = this.name;
    }
    next();
});

module.exports = mongoose.model('Brand', BrandSchema);
