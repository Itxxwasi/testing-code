const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Brand = require('../models/Brand');
const Media = require('../models/Media');

// Helper function to assign image fields
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
        if (err.statusCode) {
            throw err;
        }
        const error = new Error('Error assigning image fields: ' + (err.message || 'Unknown error'));
        error.statusCode = 400;
        throw error;
    }
}

// Get all brands (admin)
// IMPORTANT: This route requires adminAuth middleware
router.get('/', adminAuth, async (req, res) => {
    try {
        console.log('📥 Admin brands API called - /api/admin/brands');
        console.log('   User ID:', req.user?.id);
        console.log('   User Role:', req.user?.role);
        
        const brands = await Brand.find()
            .populate('imageUpload', 'url originalName mimeType')
            .sort({ order: 1, createdAt: -1 });
        
        // Ensure all brands have image URLs
        brands.forEach(brand => {
            if (brand.imageUpload && brand.imageUpload.url && !brand.image) {
                brand.image = brand.imageUpload.url;
            }
            // Ensure image URL is a string
            if (brand.image) {
                brand.image = String(brand.image).trim();
            }
        });
        
        console.log(`   ✅ Fetched ${brands.length} brands from database`);
        brands.forEach(brand => {
            console.log(`      - ${brand.name}: image="${brand.image || 'NO'}", imageUpload=${brand.imageUpload ? 'YES' : 'NO'}, active=${brand.isActive}`);
        });
        
        res.json(brands);
    } catch (error) {
        console.error('❌ Error fetching brands:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all active brands (public)
// IMPORTANT: This route must be defined BEFORE /:id to avoid route conflicts
router.get('/public', async (req, res) => {
    try {
        console.log('📥 Public brands API called - /api/brands/public');
        
        const brands = await Brand.find({ isActive: true })
            .populate('imageUpload', 'url')
            .sort({ order: 1, createdAt: -1 })
            .select('name image alt link order');
        
        console.log(`   Found ${brands.length} active brands in database`);
        
        // Ensure all brands have image URLs
        brands.forEach(brand => {
            if (brand.imageUpload && brand.imageUpload.url && !brand.image) {
                brand.image = brand.imageUpload.url;
            }
            // Ensure image URL is a string and not null/undefined
            if (brand.image) {
                brand.image = String(brand.image).trim();
                // Log the image URL for debugging
                console.log(`   Brand "${brand.name}": image="${brand.image}"`);
            }
        });
        
        // Filter out brands without valid image URLs
        const brandsWithImages = brands.filter(brand => {
            const hasValidImage = brand.image && 
                                 brand.image !== 'null' && 
                                 brand.image !== 'undefined' && 
                                 brand.image.trim() !== '';
            if (!hasValidImage) {
                console.warn(`   ⚠️  Brand "${brand.name}" filtered out - no valid image URL`);
            }
            return hasValidImage;
        });
        
        console.log(`   Returning ${brandsWithImages.length} brands with valid image URLs`);
        
        if (brandsWithImages.length < brands.length) {
            console.warn(`   ⚠️  ${brands.length - brandsWithImages.length} brands without valid images filtered out`);
        }
        
        if (brandsWithImages.length === 0) {
            console.warn('   ⚠️  No brands with valid images to return');
        }
        
        // Log all image URLs being returned
        brandsWithImages.forEach(brand => {
            console.log(`      → ${brand.name}: ${brand.image}`);
        });
        
        res.json(brandsWithImages);
    } catch (error) {
        console.error('❌ Error fetching public brands:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single brand
router.get('/:id', adminAuth, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id)
            .populate('imageUpload', 'url originalName mimeType');
        
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }
        res.json(brand);
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create brand
router.post('/', adminAuth, async (req, res) => {
    try {
        // Validation
        const { name, image, imageFileId, alt, link, order, isActive } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Brand name is required' });
        }

        if (!image && !imageFileId) {
            return res.status(400).json({ message: 'Brand image is required' });
        }

        const brand = new Brand({
            name: name.trim(),
            alt: alt ? alt.trim() : name.trim(),
            link: link ? link.trim() : undefined,
            order: order !== undefined ? parseInt(order, 10) : 0,
            isActive: isActive !== undefined ? isActive : true
        });

        await assignImageFields(brand, req.body);

        // Verify image is set before saving
        if (!brand.image) {
            console.error('ERROR: Brand image not set before save!', {
                providedUrl: req.body.image,
                imageFileId: req.body.imageFileId,
                brand: brand.toObject()
            });
            return res.status(400).json({ message: 'Brand image is required and was not set correctly' });
        }

        // Save brand to database
        await brand.save();
        
        // Populate imageUpload before sending response
        await brand.populate('imageUpload', 'url originalName mimeType');
        
        // Ensure image URL is set even if imageUpload is populated
        if (brand.imageUpload && brand.imageUpload.url && !brand.image) {
            brand.image = brand.imageUpload.url;
            await brand.save();
        }
        
        console.log('Brand saved to database successfully:', {
            id: brand._id,
            name: brand.name,
            image: brand.image,
            hasImageUpload: !!brand.imageUpload,
            imageUploadUrl: brand.imageUpload?.url,
            imageUploadId: brand.imageUpload?._id,
            isActive: brand.isActive
        });
        
        res.status(201).json(brand);
    } catch (error) {
        console.error('Error creating brand:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update brand
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        // Validation
        const { name, image, imageFileId, alt, link, order, isActive } = req.body;

        if (name !== undefined) {
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Brand name is required' });
            }
            brand.name = name.trim();
        }

        if (alt !== undefined) {
            brand.alt = alt ? alt.trim() : brand.name;
        }

        if (link !== undefined) {
            brand.link = link ? link.trim() : undefined;
        }

        if (order !== undefined) {
            brand.order = parseInt(order, 10);
        }

        if (isActive !== undefined) {
            brand.isActive = isActive;
        }

        // Only update image if provided
        if (image || imageFileId) {
            await assignImageFields(brand, req.body);
            
            // Verify image is set after assignment
            if (!brand.image) {
                console.error('ERROR: Brand image not set after assignImageFields!', {
                    providedUrl: req.body.image,
                    imageFileId: req.body.imageFileId
                });
            }
        }

        // Ensure image URL is set even if imageUpload is populated
        if (brand.imageUpload && brand.imageUpload.url && !brand.image) {
            brand.image = brand.imageUpload.url;
        }

        // Update brand in database
        await brand.save();
        
        // Populate imageUpload before sending response
        await brand.populate('imageUpload', 'url originalName mimeType');
        
        // Final check - ensure image is in response
        if (brand.imageUpload && brand.imageUpload.url && !brand.image) {
            brand.image = brand.imageUpload.url;
        }
        
        console.log('Brand updated in database successfully:', {
            id: brand._id,
            name: brand.name,
            image: brand.image,
            hasImageUpload: !!brand.imageUpload,
            imageUploadUrl: brand.imageUpload?.url,
            imageUploadId: brand.imageUpload?._id,
            isActive: brand.isActive
        });
        
        res.json(brand);
    } catch (error) {
        console.error('Error updating brand:', error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
});

// Delete brand
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        await brand.deleteOne();
        res.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
