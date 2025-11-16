/**
 * Create Categories for Navbar from Reference Image
 * Categories: 11.11 Sale, Makeup, Skin Care, Hair Care, Shampoo, Lingerie, Perfumes, Watches, Toiletries, Electronics, Optics, Toys
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Department = require('../models/Department');

// Categories to create/update based on reference image
const navbarCategories = [
    {
        name: '11.11 Sale',
        description: 'Special sale items for 11.11 promotion',
        departmentName: 'Cosmetics', // Default department
        image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: true,
        order: 0
    },
    {
        name: 'Makeup',
        description: 'Makeup products including foundations, lipsticks, eyeshadows, and more',
        departmentName: 'Cosmetics',
        image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: true,
        order: 1
    },
    {
        name: 'Skin Care',
        description: 'Skincare products for healthy and glowing skin',
        departmentName: 'Skincare',
        image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: true,
        order: 2
    },
    {
        name: 'Hair Care',
        description: 'Hair care products including shampoos, conditioners, and treatments',
        departmentName: 'Hair Care',
        image: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: true,
        order: 3
    },
    {
        name: 'Shampoo',
        description: 'Hair shampoos for all hair types',
        departmentName: 'Hair Care',
        image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 4
    },
    {
        name: 'Lingerie',
        description: 'Women\'s intimate apparel and lingerie',
        departmentName: 'Cosmetics', // Default - you may want to create a Lingerie department
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 5
    },
    {
        name: 'Perfumes',
        description: 'Fragrances and perfumes for men and women',
        departmentName: 'Fragrances',
        image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: true,
        order: 6
    },
    {
        name: 'Watches',
        description: 'Wristwatches and timepieces',
        departmentName: 'Cosmetics', // Default - you may want to create a Watches department
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 7
    },
    {
        name: 'Toiletries',
        description: 'Personal care and hygiene products',
        departmentName: 'Cosmetics',
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 8
    },
    {
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        departmentName: 'Cosmetics', // Default - you may want to create an Electronics department
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 9
    },
    {
        name: 'Optics',
        description: 'Eyeglasses, sunglasses, and optical accessories',
        departmentName: 'Cosmetics', // Default - you may want to create an Optics department
        image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 10
    },
    {
        name: 'Toys',
        description: 'Toys and games for children',
        departmentName: 'Cosmetics', // Default - you may want to create a Toys department
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80',
        isActive: true,
        isFeatured: false,
        order: 11
    }
];

async function createNavbarCategories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk');
        console.log('✅ Connected to database\n');
        console.log('='.repeat(60));
        console.log('CREATING NAVBAR CATEGORIES');
        console.log('='.repeat(60) + '\n');

        // Get or create departments
        const departments = {};
        for (const catData of navbarCategories) {
            const deptName = catData.departmentName;
            if (!departments[deptName]) {
                let dept = await Department.findOne({ name: deptName, isActive: true });
                if (!dept) {
                    // Try to find any active department as fallback
                    dept = await Department.findOne({ isActive: true });
                    if (!dept) {
                        // Create default department
                        dept = await Department.create({
                            name: deptName,
                            description: `${deptName} department`,
                            isActive: true
                        });
                        console.log(`  ✓ Created department: ${deptName}`);
                    } else {
                        console.log(`  ✓ Using existing department: ${dept.name} for ${deptName}`);
                    }
                }
                departments[deptName] = dept;
            }
        }

        console.log('\nCreating/updating categories...\n');

        let created = 0;
        let updated = 0;

        for (const catData of navbarCategories) {
            try {
                const { name, description, departmentName, image, isActive, isFeatured, order } = catData;
                const department = departments[departmentName];

                // Check if category exists
                let category = await Category.findOne({ name: name.trim() });

                if (category) {
                    // Update existing category
                    category.description = description;
                    category.department = department._id;
                    category.image = image;
                    category.isActive = isActive;
                    category.isFeatured = isFeatured;
                    await category.save();
                    updated++;
                    console.log(`  ✓ Updated: ${name}`);
                } else {
                    // Create new category
                    category = await Category.create({
                        name: name.trim(),
                        description: description,
                        department: department._id,
                        image: image,
                        isActive: isActive,
                        isFeatured: isFeatured
                    });
                    created++;
                    console.log(`  ✓ Created: ${name}`);
                }
            } catch (error) {
                console.error(`  ❌ Error with "${catData.name}":`, error.message);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Created: ${created} categories`);
        console.log(`✅ Updated: ${updated} categories`);
        console.log(`✅ Total: ${created + updated} categories processed`);

        // Verify categories
        const activeCategories = await Category.find({ isActive: true })
            .populate('department', 'name')
            .sort({ name: 1 });

        console.log(`\n📋 Active Categories in Database (${activeCategories.length}):`);
        activeCategories.forEach(cat => {
            console.log(`   - ${cat.name} (Dept: ${cat.department?.name || 'None'}, Featured: ${cat.isFeatured ? 'Yes' : 'No'})`);
        });

        console.log('\n✅ Navbar categories ready!');
        console.log('   These categories will now appear in:');
        console.log('   - Admin Dashboard → Categories section');
        console.log('   - Main Page Navigation Bar');
        console.log('   - Category dropdowns');

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n📴 Database connection closed');
        process.exit(0);
    }
}

createNavbarCategories();

