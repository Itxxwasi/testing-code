/**
 * Populate Products Script
 * Adds minimum 30 products per category with trending, discounted, and new arrival products
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Department = require('../models/Department');
const Product = require('../models/Product');

// Sample product data templates
const productTemplates = {
    // Cosmetics & Makeup
    makeup: [
        { name: 'Matte Lipstick - Red Velvet', price: 1299, description: 'Long-lasting matte lipstick with rich color payoff' },
        { name: 'Foundation - Natural Beige', price: 2499, description: 'Full coverage foundation for all skin types' },
        { name: 'Mascara - Volume Boost', price: 899, description: 'Lengthening and volumizing mascara' },
        { name: 'Eyeshadow Palette - Sunset', price: 1899, description: '12-shade eyeshadow palette with matte and shimmer' },
        { name: 'Blush - Peach Glow', price: 799, description: 'Natural-looking blush for a healthy glow' },
        { name: 'Concealer - Light', price: 1199, description: 'High coverage concealer for blemishes and dark circles' },
        { name: 'Setting Spray - Matte Finish', price: 1499, description: 'Long-lasting makeup setting spray' },
        { name: 'Eyebrow Pencil - Dark Brown', price: 599, description: 'Precise eyebrow pencil for defined brows' },
        { name: 'Highlighter - Golden Glow', price: 999, description: 'Luminous highlighter for cheekbones' },
        { name: 'Lip Gloss - Clear Shine', price: 699, description: 'Non-sticky lip gloss with shine' },
    ],
    skincare: [
        { name: 'Face Cleanser - Gentle', price: 1299, description: 'Daily gentle cleanser for all skin types' },
        { name: 'Moisturizer - Hydrating', price: 1899, description: '24-hour hydration moisturizer' },
        { name: 'Sunscreen SPF 50', price: 1499, description: 'Broad spectrum sun protection' },
        { name: 'Serum - Vitamin C', price: 2499, description: 'Brightening vitamin C serum' },
        { name: 'Face Mask - Clay', price: 899, description: 'Deep cleansing clay mask' },
        { name: 'Toner - Rose Water', price: 799, description: 'Hydrating rose water toner' },
        { name: 'Eye Cream - Anti-Aging', price: 2199, description: 'Reduces fine lines and dark circles' },
        { name: 'Exfoliating Scrub', price: 1099, description: 'Gentle exfoliating scrub for smooth skin' },
        { name: 'Night Cream - Repair', price: 1999, description: 'Overnight skin repair cream' },
        { name: 'Face Oil - Argan', price: 1799, description: 'Nourishing argan oil for face' },
    ],
    haircare: [
        { name: 'Shampoo - Volumizing', price: 999, description: 'Adds volume and body to hair' },
        { name: 'Conditioner - Smoothing', price: 999, description: 'Smooths and detangles hair' },
        { name: 'Hair Oil - Coconut', price: 1299, description: 'Deep conditioning coconut hair oil' },
        { name: 'Hair Mask - Repair', price: 1499, description: 'Intensive repair hair mask' },
        { name: 'Hair Serum - Anti-Frizz', price: 1199, description: 'Controls frizz and adds shine' },
        { name: 'Dry Shampoo - Fresh', price: 799, description: 'Refreshes hair between washes' },
        { name: 'Hair Spray - Strong Hold', price: 899, description: 'Long-lasting hair hold spray' },
        { name: 'Hair Gel - Styling', price: 699, description: 'Flexible hold styling gel' },
        { name: 'Hair Color - Natural Black', price: 599, description: 'Permanent hair color' },
        { name: 'Hair Brush - Detangling', price: 499, description: 'Gentle detangling brush' },
    ],
    perfume: [
        { name: 'Perfume - Floral Bouquet', price: 3499, description: 'Elegant floral fragrance for women' },
        { name: 'Cologne - Fresh Citrus', price: 2999, description: 'Refreshing citrus cologne for men' },
        { name: 'Body Mist - Vanilla', price: 1299, description: 'Light vanilla body mist' },
        { name: 'Perfume - Oriental Spice', price: 3799, description: 'Exotic oriental fragrance' },
        { name: 'Cologne - Woody Notes', price: 3199, description: 'Masculine woody cologne' },
        { name: 'Perfume Roll-On - Rose', price: 899, description: 'Convenient roll-on perfume' },
        { name: 'Body Spray - Fresh', price: 799, description: 'Daily fresh body spray' },
        { name: 'Perfume - Fruity', price: 2599, description: 'Sweet fruity fragrance' },
        { name: 'Cologne - Aquatic', price: 2799, description: 'Fresh aquatic cologne' },
        { name: 'Perfume Set - Gift Box', price: 4999, description: 'Luxury perfume gift set' },
    ],
    general: [
        { name: 'Product Item', price: 999, description: 'High quality product for daily use' },
        { name: 'Premium Item', price: 1999, description: 'Premium quality product with excellent features' },
        { name: 'Standard Item', price: 799, description: 'Standard quality product at affordable price' },
        { name: 'Deluxe Item', price: 2499, description: 'Deluxe version with enhanced features' },
        { name: 'Basic Item', price: 599, description: 'Basic essential product' },
        { name: 'Professional Item', price: 2999, description: 'Professional grade product' },
        { name: 'Economy Item', price: 499, description: 'Economy option for budget buyers' },
        { name: 'Luxury Item', price: 3999, description: 'Luxury product with premium quality' },
        { name: 'Compact Item', price: 1299, description: 'Compact and portable design' },
        { name: 'Family Pack', price: 3499, description: 'Family size product pack' },
    ]
};

// Generate product name variations
function generateProductVariations(baseProducts, categoryName, count) {
    const products = [];
    const variations = ['Premium', 'Deluxe', 'Professional', 'Classic', 'Modern', 'Elegant', 'Luxury', 'Essential', 'Advanced', 'Ultra'];
    const colors = ['Red', 'Blue', 'Black', 'White', 'Pink', 'Brown', 'Gold', 'Silver', 'Green', 'Purple'];
    const sizes = ['Small', 'Medium', 'Large', 'XL', 'XXL'];
    
    let productIndex = 0;
    for (let i = 0; i < count; i++) {
        const base = baseProducts[productIndex % baseProducts.length];
        const variation = variations[i % variations.length];
        const color = colors[i % colors.length];
        const size = sizes[i % sizes.length];
        
        const name = `${variation} ${base.name} - ${color} ${size}`;
        const price = base.price + (Math.floor(Math.random() * 500) - 250); // Vary price by ±250
        const discount = i < 5 ? Math.floor(Math.random() * 30) + 10 : (i < 10 ? Math.floor(Math.random() * 20) : 0);
        
        products.push({
            name,
            price: Math.max(299, price), // Minimum price 299
            discount,
            description: base.description,
            stock: Math.floor(Math.random() * 100) + 10,
            isFeatured: i < 3,
            isTrending: i >= 5 && i < 15,
            isNewArrival: i >= 10 && i < 20,
        });
        
        productIndex++;
    }
    
    return products;
}

async function populateProducts() {
    try {
        // Connect to database
        const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        await mongoose.connect(localURI);
        console.log('✅ Connected to database\n');

        // Get all active categories
        const categories = await Category.find({ isActive: true })
            .populate('department', 'name')
            .lean();
        
        if (categories.length === 0) {
            console.error('❌ No active categories found! Please create categories first.');
            process.exit(1);
        }

        console.log(`📋 Found ${categories.length} active categories\n`);
        console.log('='.repeat(70));
        console.log('POPULATING PRODUCTS');
        console.log('='.repeat(70) + '\n');

        let totalProducts = 0;
        let trendingCount = 0;
        let discountedCount = 0;
        let newArrivalCount = 0;
        let sale1010Count = 0;

        for (const category of categories) {
            const categoryName = category.name.toLowerCase();
            
            // Determine which product template to use
            let template = productTemplates.general;
            if (categoryName.includes('makeup') || categoryName.includes('cosmetic') || categoryName.includes('lipstick') || categoryName.includes('foundation')) {
                template = productTemplates.makeup;
            } else if (categoryName.includes('skin') || categoryName.includes('face') || categoryName.includes('cream') || categoryName.includes('serum')) {
                template = productTemplates.skincare;
            } else if (categoryName.includes('hair') || categoryName.includes('shampoo') || categoryName.includes('conditioner')) {
                template = productTemplates.haircare;
            } else if (categoryName.includes('perfume') || categoryName.includes('fragrance') || categoryName.includes('cologne')) {
                template = productTemplates.perfume;
            }

            // Generate 30+ products for this category
            const productsToAdd = generateProductVariations(template, categoryName, 35);
            
            // Add category and department info
            const productsWithRelations = productsToAdd.map(product => ({
                ...product,
                category: category._id,
                department: category.department._id || category.department,
                isActive: true,
                image: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000000)}?w=400&h=400&fit=crop`,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
            }));

            // Mark some as 10.10 sale products (first 10 products of each category)
            productsWithRelations.slice(0, 10).forEach(product => {
                product.discount = Math.max(product.discount || 0, 15); // Minimum 15% discount for 10.10
                sale1010Count++;
            });

            // Count special products
            productsWithRelations.forEach(product => {
                if (product.isTrending) trendingCount++;
                if (product.discount > 0) discountedCount++;
                if (product.isNewArrival) newArrivalCount++;
            });

            // Insert products
            try {
                const result = await Product.insertMany(productsWithRelations, { ordered: false });
                console.log(`✅ Added ${result.length} products to "${category.name}"`);
                totalProducts += result.length;
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️  Some products already exist in "${category.name}", skipping duplicates`);
                } else {
                    console.error(`❌ Error adding products to "${category.name}":`, error.message);
                }
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('SUMMARY');
        console.log('='.repeat(70) + '\n');
        console.log(`✅ Total products added: ${totalProducts}`);
        console.log(`🔥 Trending products: ${trendingCount}`);
        console.log(`💰 Discounted products: ${discountedCount}`);
        console.log(`🆕 New arrival products: ${newArrivalCount}`);
        console.log(`🎉 10.10 Sale products: ${sale1010Count}`);
        console.log('\n✅ Product population complete!');
        console.log('   The homepage will now load products from the database.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n📴 Database connection closed');
        process.exit(0);
    }
}

populateProducts();

