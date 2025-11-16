/**
 * Models Index
 * Register all models and set up database syncing
 */

const mongoose = require('mongoose');
const dbSync = require('../services/databaseSync');

// Import all models (they export the model, so we need to access their schemas differently)
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Department = require('./Department');
const Order = require('./Order');
const Cart = require('./Cart');
const Slider = require('./Slider');
const Banner = require('./Banner');
const Brand = require('./Brand');
const HomepageSection = require('./HomepageSection');
const Media = require('./Media');
const VideoBanner = require('./VideoBanner');

// Register schemas for live database syncing (register always, sync only if LIVE_MONGODB_URI is set)
// Access schema from mongoose.models or model.collection.name
dbSync.registerSchema('User', mongoose.model('User').schema);
dbSync.registerSchema('Product', mongoose.model('Product').schema);
dbSync.registerSchema('Category', mongoose.model('Category').schema);
dbSync.registerSchema('Department', mongoose.model('Department').schema);
dbSync.registerSchema('Order', mongoose.model('Order').schema);
dbSync.registerSchema('Cart', mongoose.model('Cart').schema);
dbSync.registerSchema('Slider', mongoose.model('Slider').schema);
dbSync.registerSchema('Banner', mongoose.model('Banner').schema);
dbSync.registerSchema('Brand', mongoose.model('Brand').schema);
dbSync.registerSchema('HomepageSection', mongoose.model('HomepageSection').schema);
dbSync.registerSchema('Media', mongoose.model('Media').schema);
dbSync.registerSchema('VideoBanner', mongoose.model('VideoBanner').schema);

// Add post-save hooks to all models for auto-syncing
function addAutoSyncHooks(modelName, Model) {
    const schema = Model.schema;
    
    // Post-save hook: sync after save
    schema.post('save', async function(doc) {
        if (process.env.LIVE_MONGODB_URI && dbSync.isLiveConnected()) {
            try {
                await dbSync.syncDocument(modelName, schema, doc, 'save');
            } catch (error) {
                // Silent fail - local save succeeded
                console.warn(`⚠️  Auto-sync failed for ${modelName}:`, error.message);
            }
        }
    });

    // Post-update hooks
    schema.post(['findOneAndUpdate', 'findByIdAndUpdate'], async function(doc) {
        if (!doc) return;
        if (process.env.LIVE_MONGODB_URI && dbSync.isLiveConnected()) {
            try {
                await dbSync.syncDocument(modelName, schema, doc, 'update');
            } catch (error) {
                console.warn(`⚠️  Auto-sync update failed for ${modelName}:`, error.message);
            }
        }
    });

    // Post-delete hooks
    schema.post(['findOneAndDelete', 'findByIdAndDelete'], async function(doc) {
        if (!doc) return;
        if (process.env.LIVE_MONGODB_URI && dbSync.isLiveConnected()) {
            try {
                await dbSync.syncDocument(modelName, schema, doc, 'delete');
            } catch (error) {
                console.warn(`⚠️  Auto-sync delete failed for ${modelName}:`, error.message);
            }
        }
    });
}

// Apply auto-sync hooks
if (process.env.LIVE_MONGODB_URI) {
    addAutoSyncHooks('User', User);
    addAutoSyncHooks('Product', Product);
    addAutoSyncHooks('Category', Category);
    addAutoSyncHooks('Department', Department);
    addAutoSyncHooks('Order', Order);
    addAutoSyncHooks('Cart', Cart);
    addAutoSyncHooks('Slider', Slider);
    addAutoSyncHooks('Banner', Banner);
    addAutoSyncHooks('Brand', Brand);
    addAutoSyncHooks('HomepageSection', HomepageSection);
    addAutoSyncHooks('Media', Media);
    addAutoSyncHooks('VideoBanner', VideoBanner);
}

module.exports = {
    User,
    Product,
    Category,
    Department,
    Order,
    Cart,
    Slider,
    Banner,
    Brand,
    HomepageSection,
    Media,
    VideoBanner
};

