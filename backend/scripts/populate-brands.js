/**
 * Script to populate sample brand logos in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Brand = require('../models/Brand');

const sampleBrands = [
    {
        name: 'Maybelline',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Logo-maybelline.svg/2560px-Logo-maybelline.svg.png',
        alt: 'Maybelline',
        link: 'https://www.maybelline.com',
        order: 1,
        isActive: true
    },
    {
        name: 'L\'Oréal',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/L%27Or%C3%A9al_logo.svg/512px-L%27Or%C3%A9al_logo.svg.png',
        alt: 'L\'Oréal',
        link: 'https://www.loreal.com',
        order: 2,
        isActive: true
    },
    {
        name: 'Clinique',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Clinique_logo.svg/512px-Clinique_logo.svg.png',
        alt: 'Clinique',
        link: 'https://www.clinique.com',
        order: 3,
        isActive: true
    },
    {
        name: 'Garnier',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Garnier_logo.svg/320px-Garnier_logo.svg.png',
        alt: 'Garnier',
        link: 'https://www.garnier.com',
        order: 4,
        isActive: true
    },
    {
        name: 'Neutrogena',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Neutrogena_logo.svg/512px-Neutrogena_logo.svg.png',
        alt: 'Neutrogena',
        link: 'https://www.neutrogena.com',
        order: 5,
        isActive: true
    },
    {
        name: 'Nivea',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Nivea_logo.svg/512px-Nivea_logo.svg.png',
        alt: 'Nivea',
        link: 'https://www.nivea.com',
        order: 6,
        isActive: true
    },
    {
        name: 'Vaseline',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Vaseline_logo.svg/512px-Vaseline_logo.svg.png',
        alt: 'Vaseline',
        link: 'https://www.vaseline.com',
        order: 7,
        isActive: true
    },
    {
        name: 'The Ordinary',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/The_Ordinary_logo.svg/512px-The_Ordinary_logo.svg.png',
        alt: 'The Ordinary',
        link: 'https://theordinary.com',
        order: 8,
        isActive: true
    }
];

async function populateBrands() {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        
        console.log('✅ MongoDB connected successfully\n');
        
        // Check existing brands
        const existingBrands = await Brand.find();
        console.log(`Found ${existingBrands.length} existing brands in database\n`);
        
        if (existingBrands.length > 0) {
            console.log('Existing brands:');
            existingBrands.forEach(brand => {
                console.log(`  - ${brand.name} (ID: ${brand._id})`);
            });
            console.log('\n⚠️  Brands already exist. Do you want to add more? (This script will add new brands if they don\'t exist)');
        }
        
        // Add sample brands
        let added = 0;
        let skipped = 0;
        
        for (const brandData of sampleBrands) {
            try {
                // Check if brand already exists (by name)
                const existing = await Brand.findOne({ name: brandData.name });
                
                if (existing) {
                    console.log(`⏭️  Skipping "${brandData.name}" - already exists`);
                    skipped++;
                    continue;
                }
                
                // Create new brand
                const brand = new Brand(brandData);
                await brand.save();
                
                console.log(`✅ Added brand: ${brandData.name}`);
                added++;
            } catch (error) {
                console.error(`❌ Error adding "${brandData.name}":`, error.message);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Added: ${added}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${added + skipped}`);
        
        // Display all active brands
        const allBrands = await Brand.find({ isActive: true }).sort({ order: 1 });
        console.log(`\n📋 All active brands in database (${allBrands.length}):`);
        allBrands.forEach((brand, index) => {
            console.log(`   ${index + 1}. ${brand.name} - Image: ${brand.image ? 'YES' : 'NO'} - Order: ${brand.order}`);
        });
        
        console.log('\n✅ Brand population complete!');
        console.log('   You can now view brands in:');
        console.log('   - Admin Dashboard → Brand Logos');
        console.log('   - Main Page (brand logo section)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n📴 Database connection closed');
        process.exit(0);
    }
}

// Run the script
populateBrands();
