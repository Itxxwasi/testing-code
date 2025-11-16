/**
 * Database Sync Service
 * Automatically syncs data to both local and live databases
 */

const mongoose = require('mongoose');

let liveConnection = null;

// Initialize live database connection
async function initLiveConnection() {
    const liveURI = process.env.LIVE_MONGODB_URI;
    
    if (!liveURI) {
        console.log('ℹ️  LIVE_MONGODB_URI not set - data will only save to local database');
        return;
    }

    try {
        liveConnection = await mongoose.createConnection(liveURI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        }).asPromise();
        console.log('✅ Live database connected for syncing');
    } catch (error) {
        console.warn('⚠️  Live database connection failed:', error.message);
        console.warn('   Data will only save to local database');
        liveConnection = null;
    }
}

// Store schemas for live database
const liveSchemas = {};

// Register schema for live database
function registerSchema(modelName, schema) {
    if (schema) {
        liveSchemas[modelName] = schema;
    }
}

// Get model for live database
function getLiveModel(modelName, schema) {
    if (!liveConnection || liveConnection.readyState !== 1) {
        return null;
    }

    try {
        // Use the same model name on live connection
        if (liveConnection.models[modelName]) {
            return liveConnection.models[modelName];
        }
        
        // Use registered schema or provided schema
        const liveSchema = liveSchemas[modelName] || schema;
        if (!liveSchema) {
            console.warn(`⚠️  No schema found for ${modelName}`);
            return null;
        }
        
        return liveConnection.model(modelName, liveSchema);
    } catch (error) {
        console.error(`Error getting live model ${modelName}:`, error.message);
        return null;
    }
}

// Sync document to live database
async function syncToLive(modelName, schema, document, operation = 'save') {
    if (!liveConnection || liveConnection.readyState !== 1) {
        return null;
    }

    try {
        const LiveModel = getLiveModel(modelName, schema);
        if (!LiveModel) {
            return null;
        }

        const docData = document.toObject ? document.toObject() : document;
        
        if (operation === 'save' || operation === 'create') {
            // For new documents, create with same _id for consistency
            const liveDoc = new LiveModel(docData);
            // Preserve the _id from local database
            if (docData._id) {
                liveDoc._id = docData._id;
            }
            return await liveDoc.save();
        } else if (operation === 'update') {
            // For updates, use upsert to create if doesn't exist
            const filter = { _id: docData._id };
            const update = { $set: docData };
            const options = { new: true, upsert: true, runValidators: true };
            return await LiveModel.findOneAndUpdate(filter, update, options);
        } else if (operation === 'delete') {
            // For deletes
            return await LiveModel.findByIdAndDelete(docData._id || docData);
        }

        return null;
    } catch (error) {
        // Log error but don't throw - local save should still succeed
        console.warn(`⚠️  Failed to sync ${modelName} to live database (${operation}):`, error.message);
        return null;
    }
}

// Setup mongoose middleware to auto-sync on save
function setupAutoSync() {
    // This will be called after models are loaded
    // We'll set it up per model basis
}

// Manual sync function that can be called after save operations
async function syncDocument(modelName, schema, document, operation = 'save') {
    if (process.env.LIVE_MONGODB_URI) {
        return await syncToLive(modelName, schema, document, operation);
    }
    return null;
}

// Check connection status
function isLiveConnected() {
    return liveConnection && liveConnection.readyState === 1;
}

// Close live connection
async function closeLiveConnection() {
    if (liveConnection) {
        await liveConnection.close();
        liveConnection = null;
    }
}

module.exports = {
    initLiveConnection,
    registerSchema,
    syncDocument,
    syncToLive,
    setupAutoSync,
    isLiveConnected,
    closeLiveConnection,
    getLiveConnection: () => liveConnection
};

