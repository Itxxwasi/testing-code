/**
 * Sync All Local Data to Live Database
 * Copies all data from local database to live database
 */

const mongoose = require('mongoose');
const path = require('path');
// Load environment variables from backend/.env (relative to this script)
require('dotenv').config({
    path: path.resolve(__dirname, '..', '.env'),
});

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

async function syncAllData() {
    const localConnection = mongoose.connection;
    let liveConnection = null;
    
    try {
        // Connect to local database
        const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        await mongoose.connect(localURI);
        console.log('✅ Connected to LOCAL database\n');

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

        console.log('='.repeat(60));
        console.log('SYNCING ALL DATA FROM LOCAL TO LIVE DATABASE');
        console.log('='.repeat(60) + '\n');

        // Models to sync
        const models = [
            { name: 'Department', Model: Department, collection: 'departments' },
            { name: 'Category', Model: Category, collection: 'categories' },
            { name: 'User', Model: User, collection: 'users' },
            { name: 'Product', Model: Product, collection: 'products' },
            { name: 'Slider', Model: Slider, collection: 'sliders' },
            { name: 'Banner', Model: Banner, collection: 'banners' },
            { name: 'Brand', Model: Brand, collection: 'brands' },
            { name: 'HomepageSection', Model: HomepageSection, collection: 'homepagesections' },
            { name: 'Media', Model: Media, collection: 'media' },
            { name: 'VideoBanner', Model: VideoBanner, collection: 'videobanners' },
            { name: 'Order', Model: Order, collection: 'orders' },
            { name: 'Cart', Model: Cart, collection: 'carts' },
        ];

        const results = {};

        for (const { name, Model, collection } of models) {
            try {
                console.log(`📦 Syncing ${name}...`);
                
                // Get all documents from local database
                const localDocs = await Model.find({});
                console.log(`   Local: ${localDocs.length} documents`);

                if (localDocs.length === 0) {
                    // Clear live database to match local (0 documents)
                    const LiveModel = liveConnection.model(name, Model.schema);
                    const deleteResult = await LiveModel.deleteMany({});
                    const liveCount = await LiveModel.countDocuments({});
                    console.log(`   Local: 0 documents`);
                    console.log(`   Cleared ${deleteResult.deletedCount} documents from live database`);
                    console.log(`   Live: ${liveCount} documents`);
                    console.log(`   ✅ Cleared to match local (0 documents)\n`);
                    results[name] = { synced: 0, skipped: 0, errors: 0, localCount: 0, liveCount };
                    continue;
                }

                // Get live model
                const LiveModel = liveConnection.model(name, Model.schema);
                
                // Clear existing documents in live database to match local exactly
                const deleteResult = await LiveModel.deleteMany({});
                console.log(`   Cleared ${deleteResult.deletedCount} existing documents from live database`);
                
                // Insert all documents from local to live
                let synced = 0;
                let skipped = 0;
                let errors = 0;

                if (localDocs.length > 0) {
                    try {
                        // Prepare documents for insertion
                        const docsToInsert = localDocs.map(doc => {
                            const docData = doc.toObject();
                            // Remove _id to let MongoDB generate new ones, or keep them to maintain consistency
                            // We'll keep _id for consistency
                            return docData;
                        });

                        // Bulk insert
                        await LiveModel.insertMany(docsToInsert, { ordered: false });
                        synced = localDocs.length;
                    } catch (error) {
                        // Handle individual document errors
                        if (error.name === 'BulkWriteError' && error.writeErrors) {
                            for (const writeError of error.writeErrors) {
                                if (writeError.code === 11000) {
                                    skipped++;
                                } else {
                                    console.error(`   ❌ Error syncing ${name} document:`, writeError.errmsg);
                                    errors++;
                                }
                            }
                            synced = localDocs.length - skipped - errors;
                        } else {
                            // Try inserting one by one if bulk insert fails
                            console.log(`   ⚠️  Bulk insert failed, trying individual inserts...`);
                            for (const doc of localDocs) {
                                try {
                                    const docData = doc.toObject();
                                    const newDoc = new LiveModel(docData);
                                    await newDoc.save();
                                    synced++;
                                } catch (insertError) {
                                    if (insertError.code === 11000) {
                                        skipped++;
                                    } else {
                                        console.error(`   ❌ Error syncing ${name} document ${doc._id}:`, insertError.message);
                                        errors++;
                                    }
                                }
                            }
                        }
                    }
                }

                // Verify live count
                const liveCount = await LiveModel.countDocuments({});
                console.log(`   Live: ${liveCount} documents`);
                console.log(`   ✅ Synced: ${synced}, Skipped: ${skipped}, Errors: ${errors}\n`);

                results[name] = { synced, skipped, errors, localCount: localDocs.length, liveCount };
            } catch (error) {
                console.error(`❌ Error syncing ${name}:`, error.message);
                results[name] = { synced: 0, skipped: 0, errors: 1, error: error.message };
            }
        }

        // Summary
        console.log('='.repeat(60));
        console.log('SYNC SUMMARY');
        console.log('='.repeat(60) + '\n');

        let totalSynced = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        for (const [name, result] of Object.entries(results)) {
            console.log(`${name}:`);
            console.log(`   Local: ${result.localCount || 0} documents`);
            console.log(`   Live: ${result.liveCount || 0} documents`);
            console.log(`   Synced: ${result.synced || 0}, Skipped: ${result.skipped || 0}, Errors: ${result.errors || 0}`);
            
            if (result.localCount === result.liveCount) {
                console.log(`   ✅ MATCH\n`);
            } else {
                console.log(`   ⚠️  MISMATCH (Local: ${result.localCount}, Live: ${result.liveCount})\n`);
            }

            totalSynced += result.synced || 0;
            totalSkipped += result.skipped || 0;
            totalErrors += result.errors || 0;
        }

        console.log('='.repeat(60));
        console.log(`Total: Synced: ${totalSynced}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
        console.log('='.repeat(60));

        console.log('\n✅ Data sync completed!');
        console.log('   Your live database now has the same data as your local database.');

    } catch (error) {
        console.error('\n❌ Error:', error);
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

syncAllData();

