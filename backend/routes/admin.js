const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Department = require('../models/Department');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Slider = require('../models/Slider');
const Banner = require('../models/Banner');
const User = require('../models/User');

// Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const departmentsCount = await Department.countDocuments({ isActive: true });
        const categoriesCount = await Category.countDocuments({ isActive: true });
        const productsCount = await Product.countDocuments({ isActive: true });
        const usersCount = await User.countDocuments({ isActive: true });

        res.json({
            departments: departmentsCount,
            categories: categoriesCount,
            products: productsCount,
            users: usersCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all departments (admin)
router.get('/departments', adminAuth, async (req, res) => {
    try {
        const departments = await Department.find().populate('imageUpload');
        res.json(departments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all categories (admin)
router.get('/categories', adminAuth, async (req, res) => {
    try {
        const categories = await Category.find().populate('department', 'name').populate('imageUpload');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get unique collection names for filter dropdown
router.get('/collections', adminAuth, async (req, res) => {
    try {
        const collections = await Product.distinct('collectionName', {
            collectionName: { $exists: true, $ne: '', $ne: null }
        });
        // Filter out empty strings and sort
        const filteredCollections = collections
            .filter(c => c && c.trim() !== '')
            .sort();
        res.json(filteredCollections);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all products (admin)
router.get('/products', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10,
            filter,
            search,
            category,
            department,
            minPrice,
            maxPrice,
            minDiscount,
            maxDiscount,
            collection,
            section,
            includeInactive // optional flag to also show inactive products
        } = req.query;

        // Build query
        const query = {};

        // By default, show only active products in admin list
        // If includeInactive=true is passed, show all
        if (!(includeInactive === 'true' || includeInactive === '1')) {
            query.isActive = true;
        }

        // Search filter
        let searchOr = null;
        if (search) {
            searchOr = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category) {
            query.category = category;
        }

        // Department filter
        if (department) {
            query.department = department;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Discount range filter
        if (minDiscount || maxDiscount) {
            query.discount = {};
            if (minDiscount) query.discount.$gte = parseFloat(minDiscount);
            if (maxDiscount) query.discount.$lte = parseFloat(maxDiscount);
        }

        // Section filter (new way) - sections is an array, use $in
        if (section && section.trim() !== '') {
            const sectionValue = section.trim();
            query.sections = { $in: [sectionValue] };
            console.log('🔍 Section filter applied:', sectionValue);
        }
        
        // Collection filter (backward compatibility)
        if (collection) {
            query.collectionName = collection;
        }

        // Special filters
        if (filter) {
            const filterLower = filter.toLowerCase();
            switch(filterLower) {
                case 'trending':
                case 'trading':
                    query.isTrending = true;
                    break;
                case 'new':
                case 'newarrival':
                case 'new-arrival':
                    query.isNewArrival = true;
                    break;
                case 'featured':
                case 'future':
                case 'future-collection':
                    query.isFeatured = true;
                    break;
                case 'onsale':
                case 'on-sale':
                case 'discounted':
                    query.discount = { $gt: 0 };
                    break;
                case 'megasale':
                case 'mega-sale':
                case 'sale':
                    query.discount = { $gte: 15 }; // 15% or more discount
                    break;
                case 'topselling':
                case 'top-selling':
                case 'bestseller':
                case 'best-seller':
                    // Top selling = trending + featured OR use section filter if available
                    if (section && section.trim() !== '') {
                        // If section filter is set, use it instead of boolean flags
                        // Section filter already applied above
                        break;
                    }
                    // Otherwise use boolean flags
                    const topSellingOr = [
                        { isTrending: true },
                        { isFeatured: true }
                    ];
                    // Combine with search if exists
                    if (searchOr) {
                        query.$and = [
                            { $or: searchOr },
                            { $or: topSellingOr }
                        ];
                    } else {
                        query.$or = topSellingOr;
                    }
                    break;
                case 'lingerie':
                case 'lingerie-collection':
                    // Filter by category name containing "lingerie"
                    const lingerieCategory = await Category.findOne({ 
                        name: { $regex: /lingerie/i } 
                    });
                    if (lingerieCategory) {
                        query.category = lingerieCategory._id;
                    } else {
                        // Return empty results if category not found
                        query.category = null;
                    }
                    break;
                default:
                    // Try to match category name
                    const categoryMatch = await Category.findOne({ 
                        name: { $regex: new RegExp(filter, 'i') } 
                    });
                    if (categoryMatch) {
                        query.category = categoryMatch._id;
                    }
            }
        }
        
        // Apply search filter if not already combined
        if (searchOr && !query.$and) {
            query.$or = searchOr;
        }
        
        // Ensure section filter is preserved if $and is used
        if (query.$and && query.sections) {
            // Store section filter
            const sectionsFilter = query.sections;
            // Remove from top level
            delete query.sections;
            // Add to $and array (only once)
            query.$and.push({ sections: sectionsFilter });
        }

        // Debug: Log the final query
        console.log('🔍 Final query:', JSON.stringify(query, null, 2));

        const products = await Product.find(query)
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload')
            .select('name price discount image imageUpload category department stock isFeatured isTrending isNewArrival isBestSelling isTopSelling sections collectionName createdAt')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await Product.countDocuments(query);
        
        console.log(`📊 Found ${count} products matching query (page ${page}, limit ${limit})`);

        // Disable caching for admin routes - data changes frequently
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all sliders (admin)
router.get('/sliders', adminAuth, async (req, res) => {
    try {
        const sliders = await Slider.find().populate('imageUpload');
        res.json(sliders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all banners (admin)
router.get('/banners', adminAuth, async (req, res) => {
    try {
        const banners = await Banner.find().populate('imageUpload');
        res.json(banners);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all users (admin)
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const users = await User.find()
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments();

        res.json({
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;