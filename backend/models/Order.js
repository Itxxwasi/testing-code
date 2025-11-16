const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        required: true
    }
}, { _id: true });

const OrderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: false,  // Will be generated in pre-save hook or route handler
        default: undefined  // Explicitly set default to undefined
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // Optional for guest orders
    },
    // Guest customer information (for orders without account)
    guestCustomer: {
        name: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        }
    },
    items: [OrderItemSchema],
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phone: String
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    subtotal: {
        type: Number,
        required: true,
        default: 0
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash_on_delivery', 'credit_card', 'debit_card', 'bank_transfer'],
        default: 'cash_on_delivery'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true
    },
    confirmedAt: {
        type: Date
    },
    shippedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancelledReason: {
        type: String
    }
}, {
    timestamps: true
});

// Generate order number before saving (fallback if not set in route handler or if temp number)
OrderSchema.pre('save', async function(next) {
    // Only generate if orderNumber is missing or is a temporary one
    if (!this.orderNumber || this.orderNumber.startsWith('TEMP-')) {
        try {
            const Order = mongoose.model('Order');
            const count = await Order.countDocuments();
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const sequence = String(count + 1).padStart(6, '0');
            this.orderNumber = `ORD-${year}${month}${day}-${sequence}`;
            console.log('Pre-save hook generated order number:', this.orderNumber);
        } catch (error) {
            console.error('Error generating order number in pre-save hook:', error);
            // Fallback if count fails
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
            this.orderNumber = `ORD-${year}${month}${day}-${random}`;
            console.log('Pre-save hook generated fallback order number:', this.orderNumber);
        }
    }
    next();
});

// Generate orderNumber before validation (synchronous fallback)
// This MUST run before Mongoose validation to prevent "required" errors
OrderSchema.pre('validate', function(next) {
    // Always ensure orderNumber exists before validation
    // This prevents the "Path 'orderNumber' is required" error
    if (!this.orderNumber || this.orderNumber === undefined || this.orderNumber === null) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        this.orderNumber = `TEMP-${timestamp}-${random}`;
        console.warn('[Order Model] Order number not set before validation, using temporary number:', this.orderNumber);
        console.warn('[Order Model] Pre-save hook will generate proper order number');
    } else {
        console.log('[Order Model] Order number already set before validation:', this.orderNumber);
    }
    next();
});

// Update timestamps when status changes
OrderSchema.pre('save', function(next) {
    const now = new Date();
    
    if (this.isModified('status')) {
        if (this.status === 'confirmed' && !this.confirmedAt) {
            this.confirmedAt = now;
        } else if (this.status === 'shipped' && !this.shippedAt) {
            this.shippedAt = now;
        } else if (this.status === 'delivered' && !this.deliveredAt) {
            this.deliveredAt = now;
        } else if (this.status === 'cancelled' && !this.cancelledAt) {
            this.cancelledAt = now;
        }
    }
    
    next();
});

// Calculate totals
OrderSchema.methods.calculateTotals = function() {
    this.subtotal = this.items.reduce((sum, item) => {
        const itemPrice = item.price * (1 - (item.discount || 0) / 100);
        item.subtotal = itemPrice * item.quantity;
        return sum + item.subtotal;
    }, 0);
    
    this.total = this.subtotal + (this.shippingCost || 0) + (this.tax || 0);
    return this.total;
};

module.exports = mongoose.model('Order', OrderSchema);

