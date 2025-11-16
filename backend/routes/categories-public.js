const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get category by ID with products
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('department', 'name _id')
            .populate('imageUpload');
        
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Get all products for this category
        const products = await Product.find({ 
            category: req.params.id,
            isActive: true 
        })
        .populate('department', 'name _id')
        .populate('imageUpload')
        .sort({ name: 1 });

        res.json({
            category,
            products
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

