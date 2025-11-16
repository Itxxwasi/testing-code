const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Department = require('../models/Department');
const Category = require('../models/Category');

// Get homepage products (lightweight, fast)
router.get('/home', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;

        const products = await Product.find({ isActive: true })
            .select('name price discount image imageUpload createdAt')
            .populate('imageUpload', 'url')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.set({
            'Cache-Control': 'public, max-age=60, s-maxage=120',
            'Vary': 'Accept-Encoding'
        });

        res.json({ products });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all products with filters
router.get('/', async (req, res) => {
    try {
        const { 
            departmentId, 
            categoryId, 
            search,
            minPrice,
            maxPrice,
            filter,
            sort = 'name',
            page = 1,
            limit = 20
        } = req.query;

        const query = { isActive: true };
        
        // Debug logging for section filter
        if (req.query.section) {
            console.log('🔍 Public API - Section filter:', req.query.section);
        }

        if (departmentId) {
            query.department = departmentId;
        }

        if (categoryId) {
            query.category = categoryId;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Filter by section if provided (sections is an array, use $in)
        // This is CRITICAL - must filter products by section
        // When section is specified, ONLY use section filter - ignore other filters
        if (req.query.section) {
            const sectionValue = req.query.section.trim();
            query.sections = { $in: [sectionValue] };
            console.log(`🔍 Public API - Section filter applied: "${sectionValue}" (section filter only, ignoring other filters)`);
            console.log(`🔍 Public API - Query before find:`, JSON.stringify(query, null, 2));
        } else {
            // Only apply other filters if section is NOT specified
            // Handle filter parameter (trending, discounted, new, best-selling, top-selling)
            if (filter === 'trending') {
                query.isTrending = true;
            } else if (filter === 'discounted') {
                // Support minDiscount parameter for sale events (e.g., 10.10 sale)
                const minDiscount = req.query.minDiscount ? parseFloat(req.query.minDiscount) : 0;
                query.discount = { $gt: minDiscount };
            } else if (filter === 'new') {
                query.isNewArrival = true;
            } else if (filter === 'best-selling') {
                query.isBestSelling = true;
            } else if (filter === 'top-selling') {
                query.isTopSelling = true;
            }
        }
        
        // Backward compatibility: also support collection filter
        if (req.query.collection) {
            query.collectionName = req.query.collection;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let sortQuery = {};
        switch(sort) {
            case 'price-asc':
                sortQuery = { price: 1 };
                break;
            case 'price-desc':
                sortQuery = { price: -1 };
                break;
            case 'name':
            default:
                sortQuery = { name: 1 };
        }

        // Use lean() for faster queries and select only needed fields
        const products = await Product.find(query)
            .select('name price discount image imageUpload category department stock isFeatured isTrending isNewArrival isBestSelling isTopSelling sections collectionName createdAt')
            .populate('category', 'name _id')
            .populate('department', 'name _id')
            .populate('imageUpload', 'url')
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); // Faster - returns plain JS objects

        const total = await Product.countDocuments(query);
        
        // Debug logging
        if (req.query.section) {
            console.log(`📊 Public API - Found ${total} products for section: ${req.query.section}`);
            console.log(`📊 Public API - Returning ${products.length} products (limit: ${limit})`);
            // Log product names to verify they match the section
            if (products.length > 0) {
                console.log(`📊 Public API - Product names:`, products.map(p => p.name).join(', '));
                console.log(`📊 Public API - Product sections:`, products.map(p => p.sections || []).join(' | '));
            }
        }

        // Get all departments and categories for filters (cached separately)
        const departments = await Department.find({ isActive: true }).select('name _id').sort({ name: 1 }).lean();
        const categories = await Category.find({ isActive: true }).select('name _id department').populate('department', 'name').sort({ name: 1 }).lean();

        // Add aggressive cache headers
        res.set({
            'Cache-Control': 'public, max-age=120, s-maxage=300', // 2 min browser, 5 min CDN
            'Vary': 'Accept-Encoding'
        });
        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            filters: {
                departments,
                categories
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name _id')
            .populate('department', 'name _id')
            .populate('imageUpload');
        
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

