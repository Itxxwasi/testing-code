const mongoose = require('mongoose');

/**
 * HomepageSection Model
 * Stores all homepage sections with their configuration
 * This allows dynamic management of homepage layout from admin dashboard
 */
const HomepageSectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'heroSlider',           // Main hero carousel
            'scrollingText',      // Scrolling announcement bar
            'categoryFeatured',   // Featured categories grid
            'categoryGrid',       // Category grid with images
            'categoryCircles',    // Circular category images
            'productTabs',        // Tabbed product sections
            'productCarousel',    // Product carousel
            'bannerFullWidth',    // Full-width promotional banner
            'videoBanner',        // Video banner section
            'collectionLinks',    // Collection/category links
            'newsletterSocial',   // Newsletter signup with social links
            'brandMarquee',       // Brand logos marquee
            'customHTML'          // Custom HTML section
        ]
    },
    title: {
        type: String,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    // Configuration object - structure varies by section type
    config: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
        // Examples:
        // For heroSlider: { sliderIds: [], autoplay: true, autoplaySpeed: 3000 }
        // For categoryFeatured: { categoryIds: [], gridColumns: 4, showTitle: true }
        // For productTabs: { tabs: [{label: 'New', filter: 'isNewArrival'}, ...] }
        // For productCarousel: { categoryId: null, productIds: [], limit: 10, autoplay: true }
        // For bannerFullWidth: { bannerId: null, height: 'auto' }
        // For scrollingText: { text: '', speed: 12, backgroundColor: '#ffffff', textColor: '#000000' }
        // For newsletterSocial: { title: '', description: '', socialLinks: {} }
    },
    ordering: {
        type: Number,
        default: 0,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    // Responsive display settings
    displayOn: {
        desktop: { type: Boolean, default: true },
        tablet: { type: Boolean, default: true },
        mobile: { type: Boolean, default: true }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for efficient queries
HomepageSectionSchema.index({ ordering: 1, isActive: 1, isPublished: 1 });

module.exports = mongoose.model('HomepageSection', HomepageSectionSchema);

