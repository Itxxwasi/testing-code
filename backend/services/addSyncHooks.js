/**
 * Add sync hooks to mongoose models
 * Automatically syncs data to live database on save/update/delete
 */

const dbSync = require('./databaseSync');

// Add post-save hook to sync to live database
function addSyncHooks(schema, modelName) {
    // Post-save hook: sync after creating or updating a document
    schema.post(['save', 'findOneAndUpdate', 'findByIdAndUpdate'], async function(doc) {
        if (!doc) return;
        
        // Only sync if live database is configured
        if (process.env.LIVE_MONGODB_URI && dbSync.isLiveConnected()) {
            try {
                await dbSync.syncDocument(modelName, schema, doc, doc.isNew ? 'create' : 'update');
                console.log(`✅ Synced ${modelName} to live database: ${doc._id}`);
            } catch (error) {
                // Don't throw error - local save succeeded
                console.warn(`⚠️  Failed to sync ${modelName} to live database:`, error.message);
            }
        }
    });

    // Pre-remove hook: sync deletion to live database
    schema.post(['remove', 'findOneAndDelete', 'findByIdAndDelete'], async function(doc) {
        if (!doc) return;
        
        if (process.env.LIVE_MONGODB_URI && dbSync.isLiveConnected()) {
            try {
                await dbSync.syncDocument(modelName, schema, doc, 'delete');
                console.log(`✅ Synced ${modelName} deletion to live database: ${doc._id}`);
            } catch (error) {
                console.warn(`⚠️  Failed to sync ${modelName} deletion to live database:`, error.message);
            }
        }
    });
}

module.exports = {
    addSyncHooks
};

