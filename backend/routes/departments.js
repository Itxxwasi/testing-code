const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Media = require('../models/Media');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

async function assignImageFields(target, body) {
    const providedUrl = body.image;
    if (providedUrl !== undefined) {
        target.image = providedUrl;
    }

    const fileId = body.imageFileId;
    if (fileId && fileId !== 'null' && fileId !== 'undefined') {
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
    } else if (fileId === '' || fileId === null) {
        target.imageUpload = undefined;
    }
}

// Get all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).populate('imageUpload');
        res.json(departments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get department by ID
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id).populate('imageUpload');
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.json(department);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new department (admin only)
router.post('/', adminAuth, async (req, res) => {
    const department = new Department({
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });

    try {
        await assignImageFields(department, req.body);
        const newDepartment = await department.save();
        const populatedDepartment = await Department.findById(newDepartment._id).populate('imageUpload');
        res.status(201).json(populatedDepartment);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Update a department (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        department.name = req.body.name || department.name;
        department.description = req.body.description || department.description;
        department.isActive = req.body.isActive !== undefined ? req.body.isActive : department.isActive;

        await assignImageFields(department, req.body);

        await department.save();
        const populatedDepartment = await Department.findById(department._id).populate('imageUpload');
        res.json(populatedDepartment);
    } catch (err) {
        const status = err.statusCode || 400;
        res.status(status).json({ message: err.message });
    }
});

// Delete a department (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        department.isActive = false;
        await department.save();
        res.json({ message: 'Department deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;