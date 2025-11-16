/**
 * Compare Local and Live Databases
 * Shows data counts from both databases for comparison
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Slider = require('../models/Slider');
const Banner = require('../models/Banner');
const Brand = require('../models/Brand');
const HomepageSection = require('../models/HomepageSection');
const Media = require('../models/Media');
const VideoBanner = require('../models/VideoBanner');

async function compareDatabases() {
    const localConnection = mongoose.connection;
    let liveConnection = null;
    
    try {
        // Connect to local database
        const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        await mongoose.connect(localURI);
        console.log('✅ Connected to LOCAL database');

        // Connect to live database
        const liveURI = process.env.LIVE_MONGODB_URI;
        if (!liveURI) {
            console.error('❌ LIVE_MONGODB_URI not set in .env file');
            process.exit(1);
        }

        liveConnection = await mongoose.createConnection(liveURI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        }).asPromise();
        console.log('✅ Connected to LIVE database\n');

        console.log('='.repeat(70));
        console.log('DATABASE COMPARISON');
        console.log('='.repeat(70) + '\n');

        // Models to compare
        const models = [
            { name: 'Department', Model: Department },
            { name: 'Category', Model: Category },
            { name: 'User', Model: User },
            { name: 'Product', Model: Product },
            { name: 'Slider', Model: Slider },
            { name: 'Banner', Model: Banner },
            { name: 'Brand', Model: Brand },
            { name: 'HomepageSection', Model: HomepageSection },
            { name: 'Media', Model: Media },
            { name: 'VideoBanner', Model: VideoBanner },
            { name: 'Order', Model: Order },
            { name: 'Cart', Model: Cart },
        ];

        const results = [];
        let allMatch = true;

        console.log(`${'Model'.padEnd(20)} ${'Local'.padEnd(10)} ${'Live'.padEnd(10)} ${'Status'}`);
        console.log('-'.repeat(70));

        for (const { name, Model } of models) {
            try {
                // Count local documents
                const localCount = await Model.countDocuments({});

                // Count live documents
                const LiveModel = liveConnection.model(name, Model.schema);
                const liveCount = await LiveModel.countDocuments({});

                const matches = localCount === liveCount;
                const status = matches ? '✅ MATCH' : '⚠️  MISMATCH';

                if (!matches) {
                    allMatch = false;
                }

                console.log(
                    `${name.padEnd(20)} ${localCount.toString().padEnd(10)} ${liveCount.toString().padEnd(10)} ${status}`
                );

                results.push({ name, localCount, liveCount, matches });
            } catch (error) {
                console.error(`❌ Error comparing ${name}:`, error.message);
                results.push({ name, localCount: -1, liveCount: -1, matches: false, error: error.message });
                allMatch = false;
            }
        }

        console.log('-'.repeat(70));
        console.log('\n' + '='.repeat(70));

        if (allMatch) {
            console.log('✅ All databases match!');
            console.log('   Your live database has the same data as your local database.');
        } else {
            console.log('⚠️  Databases do not match!');
            console.log('   Run: node scripts/sync-all-data-to-live.js');
            console.log('   This will sync all local data to your live database.');
        }

        console.log('='.repeat(70));

        // Detailed breakdown
        console.log('\n📊 DETAILED BREAKDOWN:\n');
        for (const result of results) {
            if (!result.matches && result.localCount !== -1) {
                console.log(`${result.name}:`);
                console.log(`   Local: ${result.localCount} documents`);
                console.log(`   Live: ${result.liveCount} documents`);
                console.log(`   Difference: ${Math.abs(result.localCount - result.liveCount)} documents\n`);
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (liveConnection) {
            await liveConnection.close();
            console.log('\n📴 Live database connection closed');
        }
        await mongoose.disconnect();
        console.log('📴 Local database connection closed');
        process.exit(0);
    }
}

compareDatabases();

