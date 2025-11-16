const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
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
    images: [{
        type: String
    }],
    imageUploads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media'
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isTrending: {
        type: Boolean,
        default: false
    },
    isNewArrival: {
        type: Boolean,
        default: false
    },
    isBestSelling: {
        type: Boolean,
        default: false
    },
    isTopSelling: {
        type: Boolean,
        default: false
    },
    sections: {
        type: [String],
        default: [],
        enum: [
            'Top Selling',
            'Lingerie Collection',
            'Product Feature Collection',
            '10.10 Mega Sale',
            'New Arrivals',
            'Best Sellers',
            'On Sale'
        ]
    },
    // Keep collectionName for backward compatibility but deprecated
    collectionName: {
        type: String,
        trim: true,
        default: ''
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

module.exports = mongoose.model('Product', ProductSchema);