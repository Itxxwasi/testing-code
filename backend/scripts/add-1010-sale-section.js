/**
 * Add 10.10 Sale Section
 * Adds or updates a homepage section for 10.10 sale products
 */

const mongoose = require('mongoose');
require('dotenv').config();

const HomepageSection = require('../models/HomepageSection');

async function addSaleSection() {
    try {
        const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        await mongoose.connect(localURI);
        console.log('✅ Connected to database\n');

        // Check if 10.10 sale section exists
        let saleSection = await HomepageSection.findOne({ name: '10.10 Sale' });
        
        if (saleSection) {
            // Update existing section
            saleSection.config = {
                filter: 'discounted',
                limit: 12,
                showArrows: true,
                minDiscount: 15 // Minimum 15% discount for 10.10 sale
            };
            saleSection.isActive = true;
            saleSection.isPublished = true;
            saleSection.ordering = 5; // After new arrivals
            await saleSection.save();
            console.log('✅ Updated existing 10.10 Sale section');
        } else {
            // Create new section
            saleSection = await HomepageSection.create({
                name: '10.10 Sale',
                type: 'productCarousel',
                title: '10.10 Mega Sale',
                subtitle: 'Up to 50% off on selected items',
                description: 'Don\'t miss out on our biggest sale of the year!',
                ordering: 5,
                isActive: true,
                isPublished: true,
                config: {
                    filter: 'discounted',
                    limit: 12,
                    showArrows: true,
                    minDiscount: 15
                }
            });
            console.log('✅ Created new 10.10 Sale section');
        }

        console.log('\nSection Details:');
        console.log(`  Name: ${saleSection.name}`);
        console.log(`  Type: ${saleSection.type}`);
        console.log(`  Title: ${saleSection.title}`);
        console.log(`  Active: ${saleSection.isActive}`);
        console.log(`  Published: ${saleSection.isPublished}`);
        console.log(`  Config:`, JSON.stringify(saleSection.config, null, 2));

        console.log('\n✅ 10.10 Sale section is ready!');
        console.log('   Products with 15%+ discount will be displayed.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

addSaleSection();

