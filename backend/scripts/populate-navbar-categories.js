const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Department = require('../models/Department');

async function run() {
    let exitCode = 0;
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk');
        console.log('MongoDB connected');
        console.log('Starting navbar categories population...\n');

        // Get or create a default department
        let defaultDepartment = await Department.findOne({ name: 'Cosmetics' });
        if (!defaultDepartment) {
            defaultDepartment = await Department.findOne({ isActive: true });
        }
        if (!defaultDepartment) {
            defaultDepartment = await Department.create({
                name: 'Cosmetics',
                description: 'Makeup, Skincare & Beauty Products',
                isActive: true
            });
            console.log('  ✓ Created default department: Cosmetics\n');
        }

        // Navbar categories to add
        const navbarCategories = [
            { name: 'Makeup', description: 'Makeup Products', image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80' },
            { name: 'Skin Care', description: 'Skincare Products', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80' },
            { name: 'Hair Care', description: 'Hair Care Products', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80' },
            { name: 'Shampoo', description: 'Shampoo Products', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80' },
            { name: 'Lingerie', description: 'Lingerie Collection', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80' },
            { name: 'Perfumes', description: 'Perfumes & Fragrances', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80' },
            { name: 'Watches', description: 'Watches Collection', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' },
            { name: 'Toiletries', description: 'Toiletries & Personal Care', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80' },
            { name: 'Electronics', description: 'Electronics Products', image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=800&q=80' },
            { name: 'Optics', description: 'Optics & Eyewear', image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=800&q=80' },
            { name: 'Toys', description: 'Toys & Games', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=800&q=80' }
        ];

        console.log('Creating/updating navbar categories...');
        const createdCategories = [];

        for (const catData of navbarCategories) {
            let category = await Category.findOne({ name: catData.name });
            if (category) {
                // Update existing category
                category.description = catData.description;
                category.image = catData.image;
                category.department = defaultDepartment._id;
                category.isActive = true;
                category.isFeatured = true; // Mark as featured for navbar display
                await category.save();
                console.log(`  ✓ Updated category: "${catData.name}"`);
            } else {
                // Create new category
                category = await Category.create({
                    name: catData.name,
                    description: catData.description,
                    image: catData.image,
                    department: defaultDepartment._id,
                    isActive: true,
                    isFeatured: true // Mark as featured for navbar display
                });
                console.log(`  ✓ Created category: "${catData.name}"`);
            }
            createdCategories.push(category._id.toString());
        }

        console.log(`\n  ✓ Total categories processed: ${createdCategories.length}`);
        console.log('  ✓ Navbar categories ready!\n');

        exitCode = 0;
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.name === 'MongooseServerSelectionError') {
            console.error('  ⚠️  Cannot connect to MongoDB. Please check:');
            console.error('     - MongoDB is running');
            console.error('     - MONGODB_URI in .env file is correct');
            console.error('     - Network connectivity');
        } else {
            console.error('  Stack:', error.stack);
        }
        exitCode = 1;
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('MongoDB disconnected');
        }
        process.exit(exitCode);
    }
}

run();

