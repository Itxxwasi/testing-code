/**
 * Dual Database Service
 * Syncs data to both local and live databases
 */

const mongoose = require('mongoose');

let localConnection = null;
let liveConnection = null;

// Initialize both database connections
async function initConnections() {
    const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
    const liveURI = process.env.LIVE_MONGODB_URI;

    try {
        // Connect to local database (primary)
        if (!localConnection || localConnection.readyState !== 1) {
            localConnection = await mongoose.createConnection(localURI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }).asPromise();
            console.log('✅ Local database connected');
        }

        // Connect to live database (secondary) - if URI is provided
        if (liveURI && (!liveConnection || liveConnection.readyState !== 1)) {
            try {
                liveConnection = await mongoose.createConnection(liveURI, {
                    serverSelectionTimeoutMS: 10000,
                    socketTimeoutMS: 45000,
                }).asPromise();
                console.log('✅ Live database connected');
            } catch (liveError) {
                console.warn('⚠️  Live database connection failed:', liveError.message);
                console.warn('   Continuing with local database only');
                liveConnection = null;
            }
        } else if (!liveURI) {
            console.log('ℹ️  LIVE_MONGODB_URI not set - using local database only');
        }
    } catch (error) {
        console.error('❌ Error initializing database connections:', error);
        throw error;
    }
}

// Get model for a specific connection
function getModel(connection, modelName, schema) {
    if (!connection) return null;
    
    // Check if model already exists on this connection
    if (connection.models[modelName]) {
        return connection.models[modelName];
    }
    
    return connection.model(modelName, schema);
}

// Save document to both databases
async function saveToBoth(modelName, schema, documentData, options = {}) {
    const results = {
        local: null,
        live: null,
        errors: []
    };

    try {
        // Save to local database (primary)
        const LocalModel = mongoose.model(modelName);
        let document;
        
        if (options.isNew) {
            document = new LocalModel(documentData);
            results.local = await document.save();
        } else {
            results.local = await LocalModel.findByIdAndUpdate(
                documentData._id || documentData.id,
                { $set: documentData },
                { new: true, runValidators: true }
            );
        }

        // Save to live database (secondary) - if connected
        if (liveConnection) {
            try {
                const LiveModel = getModel(liveConnection, modelName, schema);
                if (LiveModel) {
                    if (options.isNew && results.local) {
                        // Create new document with same data
                        const liveData = results.local.toObject();
                        delete liveData._id; // Let live DB generate its own ID or use the same
                        if (results.local._id) {
                            liveData._id = results.local._id; // Use same ID for consistency
                        }
                        const liveDoc = new LiveModel(liveData);
                        results.live = await liveDoc.save();
                    } else if (results.local) {
                        // Update existing document
                        results.live = await LiveModel.findByIdAndUpdate(
                            results.local._id,
                            { $set: results.local.toObject() },
                            { new: true, upsert: true, runValidators: true }
                        );
                    }
                }
            } catch (liveError) {
                console.warn(`⚠️  Failed to sync ${modelName} to live database:`, liveError.message);
                results.errors.push({
                    database: 'live',
                    error: liveError.message
                });
                // Don't throw - continue with local save
            }
        }

        return results;
    } catch (localError) {
        results.errors.push({
            database: 'local',
            error: localError.message
        });
        throw localError; // Throw local errors as they're critical
    }
}

// Delete from both databases
async function deleteFromBoth(modelName, schema, documentId) {
    const results = {
        local: null,
        live: null,
        errors: []
    };

    try {
        // Delete from local database
        const LocalModel = mongoose.model(modelName);
        results.local = await LocalModel.findByIdAndDelete(documentId);

        // Delete from live database
        if (liveConnection && results.local) {
            try {
                const LiveModel = getModel(liveConnection, modelName, schema);
                if (LiveModel) {
                    results.live = await LiveModel.findByIdAndDelete(documentId);
                }
            } catch (liveError) {
                console.warn(`⚠️  Failed to delete ${modelName} from live database:`, liveError.message);
                results.errors.push({
                    database: 'live',
                    error: liveError.message
                });
            }
        }

        return results;
    } catch (localError) {
        results.errors.push({
            database: 'local',
            error: localError.message
        });
        throw localError;
    }
}

// Bulk save to both databases
async function bulkSaveToBoth(modelName, schema, documents, options = {}) {
    const results = {
        local: [],
        live: [],
        errors: []
    };

    try {
        const LocalModel = mongoose.model(modelName);
        results.local = await LocalModel.insertMany(documents, options);

        if (liveConnection && results.local.length > 0) {
            try {
                const LiveModel = getModel(liveConnection, modelName, schema);
                if (LiveModel) {
                    const liveDocuments = results.local.map(doc => {
                        const data = doc.toObject();
                        return data;
                    });
                    results.live = await LiveModel.insertMany(liveDocuments, options);
                }
            } catch (liveError) {
                console.warn(`⚠️  Failed to bulk sync ${modelName} to live database:`, liveError.message);
                results.errors.push({
                    database: 'live',
                    error: liveError.message
                });
            }
        }

        return results;
    } catch (localError) {
        results.errors.push({
            database: 'local',
            error: localError.message
        });
        throw localError;
    }
}

// Get connection status
function getConnectionStatus() {
    return {
        local: localConnection ? localConnection.readyState === 1 : false,
        live: liveConnection ? liveConnection.readyState === 1 : false
    };
}

// Close connections
async function closeConnections() {
    if (localConnection) {
        await localConnection.close();
    }
    if (liveConnection) {
        await liveConnection.close();
    }
}

module.exports = {
    initConnections,
    saveToBoth,
    deleteFromBoth,
    bulkSaveToBoth,
    getConnectionStatus,
    closeConnections,
    getLocalConnection: () => localConnection,
    getLiveConnection: () => liveConnection
};

