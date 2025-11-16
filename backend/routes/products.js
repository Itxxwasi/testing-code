const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Media = require('../models/Media');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

async function assignImageFields(target, body) {
    try {
        const providedUrl = body.image;
        if (providedUrl !== undefined && providedUrl !== null && providedUrl !== '') {
            target.image = providedUrl.trim();
        }

        const fileId = body.imageFileId;
        if (fileId && fileId !== 'null' && fileId !== 'undefined' && fileId !== '') {
            try {
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
            } catch (mediaError) {
                // If media lookup fails, throw a user-friendly error
                if (mediaError.statusCode) {
                    throw mediaError;
                }
                const error = new Error('Error loading image file: ' + (mediaError.message || 'Invalid file reference'));
                error.statusCode = 400;
                throw error;
            }
        } else if (fileId === '' || fileId === null || fileId === 'null' || fileId === 'undefined') {
            target.imageUpload = undefined;
        }
    } catch (err) {
        // Re-throw with context if it's already a status code error
        if (err.statusCode) {
            throw err;
        }
        // Otherwise wrap in a proper error
        const error = new Error('Error assigning image fields: ' + (err.message || 'Unknown error'));
        error.statusCode = 400;
        throw error;
    }
}

// Get all products
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, category, department, search } = req.query;
        const query = { isActive: true };

        if (category) query.category = category;
        if (department) query.department = department;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await Product.countDocuments(query);

        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get trending products
router.get('/trading', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, isTrending: true })
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload')
            .limit(8);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get discounted products
router.get('/discounted', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, discount: { $gt: 0 } })
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload')
            .limit(8);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get new arrivals
router.get('/new', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true, isNewArrival: true })
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload')
            .limit(8);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new product (admin only)
router.post('/', adminAuth, async (req, res) => {
    try {
        // Validate required fields
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ message: 'Product name is required' });
        }
        
        if (!req.body.category) {
            return res.status(400).json({ message: 'Category is required' });
        }
        
        if (!req.body.description || !req.body.description.trim()) {
            return res.status(400).json({ message: 'Product description is required' });
        }
        
        if (req.body.price === undefined || req.body.price === null || req.body.price === '') {
            return res.status(400).json({ message: 'Product price is required' });
        }
        
        const price = parseFloat(req.body.price);
        if (Number.isNaN(price) || price < 0) {
            return res.status(400).json({ message: 'Product price must be a valid number greater than or equal to 0' });
        }
        
        if (req.body.stock === undefined || req.body.stock === null || req.body.stock === '') {
            return res.status(400).json({ message: 'Stock quantity is required' });
        }
        
        const stock = parseInt(req.body.stock, 10);
        if (Number.isNaN(stock) || stock < 0) {
            return res.status(400).json({ message: 'Stock quantity must be a valid number greater than or equal to 0' });
        }
        
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        
        if (!category.department) {
            return res.status(400).json({ message: 'Category does not have an associated department' });
        }

        const discount = req.body.discount !== undefined && req.body.discount !== null && req.body.discount !== '' 
            ? parseFloat(req.body.discount) 
            : 0;
        
        if (Number.isNaN(discount) || discount < 0 || discount > 100) {
            return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
        }

        const product = new Product({
            name: req.body.name.trim(),
            description: req.body.description.trim(),
            price: price,
            discount: discount,
            image: req.body.image || '',
            images: req.body.images || [],
            category: req.body.category,
            department: category.department,
            stock: stock,
            isFeatured: req.body.isFeatured || false,
            isTrending: req.body.isTrending || false,
            isNewArrival: req.body.isNewArrival || false,
            isBestSelling: req.body.isBestSelling || false,
            isTopSelling: req.body.isTopSelling || false,
            // Sections should be the primary way to assign products to sections
            sections: req.body.sections || [],
            // Keep collectionName for backward compatibility, but convert to sections
            collectionName: req.body.collectionName || '',
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        });

        // Convert collectionName to sections if provided
        if (req.body.collectionName && req.body.collectionName.trim() !== '') {
            const collectionName = req.body.collectionName.trim();
            const collectionToSectionMap = {
                'Premium Collection': 'Product Feature Collection',
                'Lingerie Collection': 'Lingerie Collection',
                'Makeup Collection': 'Product Feature Collection',
                'Skincare Collection': 'Product Feature Collection',
                'Hair Care Collection': 'Product Feature Collection',
                'Perfume Collection': 'Product Feature Collection',
                'Beauty Essentials': 'Product Feature Collection',
                'Sale Collection': 'On Sale'
            };
            
            const mappedSection = collectionToSectionMap[collectionName] || 'Product Feature Collection';
            if (!product.sections.includes(mappedSection)) {
                product.sections.push(mappedSection);
            }
            console.log(`📝 Converted collectionName "${collectionName}" to section "${mappedSection}"`);
        }

        // Ensure product has at least one section assigned
        // If no sections provided, assign based on flags or default
        if (!product.sections || product.sections.length === 0) {
            const defaultSections = [];
            
            // Map boolean flags to sections
            if (product.isTopSelling) defaultSections.push('Top Selling');
            if (product.isBestSelling) defaultSections.push('Best Sellers');
            if (product.isNewArrival) defaultSections.push('New Arrivals');
            if (product.isTrending) defaultSections.push('Top Selling');
            if (product.discount > 0) {
                if (product.discount >= 10) {
                    defaultSections.push('10.10 Mega Sale');
                } else {
                    defaultSections.push('On Sale');
                }
            }
            if (product.isFeatured) defaultSections.push('Product Feature Collection');
            
            // If still no sections, use default
            if (defaultSections.length === 0) {
                defaultSections.push('Product Feature Collection');
            }
            
            product.sections = [...new Set(defaultSections)]; // Remove duplicates
            console.log(`📝 Auto-assigned sections to new product: [${product.sections.join(', ')}]`);
        }

        await assignImageFields(product, req.body);

        const newProduct = await product.save();
        const populatedProduct = await Product.findById(newProduct._id)
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload');
        res.status(201).json(populatedProduct);
    } catch (err) {
        console.error('Error creating product:', err);
        const status = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
        const message = err.message || 'Error creating product';
        res.status(status).json({ message });
    }
});

// Update a product (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Validate fields if provided
        if (req.body.name !== undefined) {
            if (!req.body.name || !req.body.name.trim()) {
                return res.status(400).json({ message: 'Product name is required' });
            }
            product.name = req.body.name.trim();
        }
        
        if (req.body.description !== undefined) {
            if (!req.body.description || !req.body.description.trim()) {
                return res.status(400).json({ message: 'Product description is required' });
            }
            product.description = req.body.description.trim();
        }
        
        if (req.body.price !== undefined && req.body.price !== null && req.body.price !== '') {
            const price = parseFloat(req.body.price);
            if (Number.isNaN(price) || price < 0) {
                return res.status(400).json({ message: 'Product price must be a valid number greater than or equal to 0' });
            }
            product.price = price;
        }
        
        if (req.body.stock !== undefined && req.body.stock !== null && req.body.stock !== '') {
            const stock = parseInt(req.body.stock, 10);
            if (Number.isNaN(stock) || stock < 0) {
                return res.status(400).json({ message: 'Stock quantity must be a valid number greater than or equal to 0' });
            }
            product.stock = stock;
        }
        
        if (req.body.discount !== undefined && req.body.discount !== null && req.body.discount !== '') {
            const discount = parseFloat(req.body.discount);
            if (Number.isNaN(discount) || discount < 0 || discount > 100) {
                return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
            }
            product.discount = discount;
        }

        if (req.body.category) {
            const category = await Category.findById(req.body.category);
            if (!category) {
                return res.status(400).json({ message: 'Invalid category' });
            }
            if (!category.department) {
                return res.status(400).json({ message: 'Category does not have an associated department' });
            }
            product.category = req.body.category;
            product.department = category.department;
        }

        product.images = Array.isArray(req.body.images) ? req.body.images : product.images;
        product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;
        product.isFeatured = req.body.isFeatured !== undefined ? req.body.isFeatured : product.isFeatured;
        product.isTrending = req.body.isTrending !== undefined ? req.body.isTrending : product.isTrending;
        product.isNewArrival = req.body.isNewArrival !== undefined ? req.body.isNewArrival : product.isNewArrival;
        product.isBestSelling = req.body.isBestSelling !== undefined ? req.body.isBestSelling : product.isBestSelling;
        product.isTopSelling = req.body.isTopSelling !== undefined ? req.body.isTopSelling : product.isTopSelling;
        product.sections = req.body.sections !== undefined ? (req.body.sections || []) : product.sections;
        // Keep collectionName for backward compatibility, but convert to sections
        product.collectionName = req.body.collectionName !== undefined ? (req.body.collectionName || '') : product.collectionName;
        
        // Convert collectionName to sections if provided during update
        if (req.body.collectionName !== undefined && req.body.collectionName.trim() !== '') {
            const collectionName = req.body.collectionName.trim();
            const collectionToSectionMap = {
                'Premium Collection': 'Product Feature Collection',
                'Lingerie Collection': 'Lingerie Collection',
                'Makeup Collection': 'Product Feature Collection',
                'Skincare Collection': 'Product Feature Collection',
                'Hair Care Collection': 'Product Feature Collection',
                'Perfume Collection': 'Product Feature Collection',
                'Beauty Essentials': 'Product Feature Collection',
                'Sale Collection': 'On Sale'
            };
            
            const mappedSection = collectionToSectionMap[collectionName] || 'Product Feature Collection';
            if (!product.sections.includes(mappedSection)) {
                product.sections.push(mappedSection);
            }
            console.log(`📝 Converted collectionName "${collectionName}" to section "${mappedSection}"`);
        }
        
        // Ensure product has at least one section assigned after update
        if (!product.sections || product.sections.length === 0) {
            const defaultSections = [];
            
            // Map boolean flags to sections
            if (product.isTopSelling) defaultSections.push('Top Selling');
            if (product.isBestSelling) defaultSections.push('Best Sellers');
            if (product.isNewArrival) defaultSections.push('New Arrivals');
            if (product.isTrending) defaultSections.push('Top Selling');
            if (product.discount > 0) {
                if (product.discount >= 10) {
                    defaultSections.push('10.10 Mega Sale');
                } else {
                    defaultSections.push('On Sale');
                }
            }
            if (product.isFeatured) defaultSections.push('Product Feature Collection');
            
            // If still no sections, use default
            if (defaultSections.length === 0) {
                defaultSections.push('Product Feature Collection');
            }
            
            product.sections = [...new Set(defaultSections)]; // Remove duplicates
            console.log(`📝 Auto-assigned sections to updated product: [${product.sections.join(', ')}]`);
        }

        await assignImageFields(product, req.body);

        await product.save();
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name')
            .populate('department', 'name')
            .populate('imageUpload');
        res.json(populatedProduct);
    } catch (err) {
        console.error('Error updating product:', err);
        const status = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
        const message = err.message || 'Error updating product';
        res.status(status).json({ message });
    }
});

// Delete a product (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.isActive = false;
        await product.save();
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;