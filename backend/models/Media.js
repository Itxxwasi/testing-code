const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    storage: {
        type: String,
        enum: ['database', 'local', 's3', 'gcs', 'azure', 'other'],
        default: 'local'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    data: {
        type: Buffer
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Media', MediaSchema);
