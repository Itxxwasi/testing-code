const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    }
}, { _id: true });

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Calculate total before saving
CartSchema.methods.calculateTotal = function() {
    return this.items.reduce((total, item) => {
        const itemPrice = item.price * (1 - (item.discount || 0) / 100);
        return total + (itemPrice * item.quantity);
    }, 0);
};

// Get total items count
CartSchema.methods.getTotalItems = function() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
};

// Update timestamp on save
CartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Cart', CartSchema);

