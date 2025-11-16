const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get department by ID with categories and products
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Get all categories for this department
        const categories = await Category.find({ 
            department: req.params.id,
            isActive: true 
        }).populate('imageUpload').sort({ name: 1 });

        // Get all products for this department
        const products = await Product.find({ 
            department: req.params.id,
            isActive: true 
        })
        .populate('category', 'name _id')
        .populate('imageUpload')
        .sort({ name: 1 });

        res.json({
            department,
            categories,
            products
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

