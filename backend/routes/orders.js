const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's orders
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate('items.product', 'name image price')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all orders (admin only) - includes both user and guest orders
router.get('/admin/all', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        
        if (status) {
            query.status = status;
        }
        
        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .populate('items.product', 'name image price category department')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        // Format orders to include guest customer info
        const formattedOrders = orders.map(order => {
            const orderObj = order.toObject();
            // If it's a guest order, include guest customer info
            if (!order.user && order.guestCustomer) {
                orderObj.customer = {
                    name: order.guestCustomer.name,
                    email: order.guestCustomer.email,
                    phone: order.guestCustomer.phone,
                    type: 'guest'
                };
            } else if (order.user) {
                orderObj.customer = {
                    name: order.user.name,
                    email: order.user.email,
                    phone: order.user.phone,
                    type: 'user',
                    userId: order.user._id
                };
            }
            return orderObj;
        });
        
        const count = await Order.countDocuments(query);
        
        res.json({
            orders: formattedOrders,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new order (guest checkout - no auth required)
router.post('/guest', async (req, res) => {
    const startTime = Date.now();
    const requestId = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] ========== GUEST ORDER CREATION REQUEST ==========`);
    console.log(`[${requestId}] Request Body:`, JSON.stringify(req.body, null, 2));
    
    try {
        // Validate request payload
        const { items, shippingAddress, billingAddress, paymentMethod, notes, guestCustomer } = req.body;
        
        // Validate guest customer info
        if (!guestCustomer || !guestCustomer.name || !guestCustomer.email || !guestCustomer.phone) {
            return res.status(400).json({ 
                message: 'Guest customer information is required. Please provide name, email, and phone.',
                requestId: requestId
            });
        }
        
        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                message: 'Cart items are required.',
                requestId: requestId
            });
        }
        
        // Validate shipping address
        if (!shippingAddress || !shippingAddress.city || !shippingAddress.country) {
            return res.status(400).json({ 
                message: 'Shipping address is required. Please provide city and country.',
                requestId: requestId
            });
        }
        
        // Validate payment method
        const validPaymentMethods = ['cash_on_delivery', 'credit_card', 'debit_card', 'bank_transfer'];
        const finalPaymentMethod = paymentMethod || 'cash_on_delivery';
        if (!validPaymentMethods.includes(finalPaymentMethod)) {
            return res.status(400).json({ 
                message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
                requestId: requestId
            });
        }
        
        // Validate products and stock, prepare order items
        const orderItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const productId = item.productId || item.product;
            
            if (!productId) {
                return res.status(400).json({ 
                    message: `Product ID is missing for item ${i + 1}`,
                    requestId: requestId
                });
            }
            
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(400).json({ 
                    message: `Product ${i + 1} not found`,
                    requestId: requestId
                });
            }
            
            if (!product.isActive) {
                return res.status(400).json({ 
                    message: `Product "${product.name}" is no longer available`,
                    requestId: requestId
                });
            }
            
            const quantity = item.quantity || 1;
            if (product.stock < quantity) {
                return res.status(400).json({ 
                    message: `Not enough stock for "${product.name}". Available: ${product.stock}, Requested: ${quantity}`,
                    requestId: requestId
                });
            }
            
            const itemPrice = product.price * (1 - (product.discount || 0) / 100);
            orderItems.push({
                product: product._id,
                quantity: quantity,
                price: product.price,
                discount: product.discount || 0,
                subtotal: itemPrice * quantity
            });
        }
        
        // Generate order number
        const orderCount = await Order.countDocuments();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const sequence = String(orderCount + 1).padStart(6, '0');
        const orderNumber = `ORD-${year}${month}${day}-${sequence}`;
        
        // Create order
        const orderData = {
            orderNumber: orderNumber,
            user: null,  // No user for guest orders
            guestCustomer: {
                name: guestCustomer.name,
                email: guestCustomer.email.toLowerCase().trim(),
                phone: guestCustomer.phone
            },
            items: orderItems,
            shippingAddress: shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            paymentMethod: finalPaymentMethod,
            notes: notes || ''
        };
        
        const order = new Order(orderData);
        order.calculateTotals();
        await order.save();
        
        // Update product stock
        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }
        
        console.log(`[${requestId}] Guest order created successfully - Order Number: ${order.orderNumber}`);
        
        res.status(201).json({
            ...order.toObject(),
            requestId: requestId
        });
    } catch (err) {
        console.error(`[${requestId}] Guest order creation failed:`, err);
        res.status(500).json({ 
            message: err.message || 'Failed to create order',
            requestId: requestId
        });
    }
});

// Create a new order from cart (authenticated users)
router.post('/', auth, async (req, res) => {
    const startTime = Date.now();
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] ========== ORDER CREATION REQUEST ==========`);
    console.log(`[${requestId}] User ID:`, req.user.id);
    console.log(`[${requestId}] Request Body:`, JSON.stringify(req.body, null, 2));
    
    try {
        // Validate request payload
        const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
        
        // Validate shipping address (required fields)
        if (!shippingAddress || !shippingAddress.city || !shippingAddress.country) {
            console.error(`[${requestId}] Validation failed: Missing required shipping address fields`);
            return res.status(400).json({ 
                message: 'Shipping address is required. Please provide city and country.',
                requestId: requestId
            });
        }
        
        // Validate payment method
        const validPaymentMethods = ['cash_on_delivery', 'credit_card', 'debit_card', 'bank_transfer'];
        const finalPaymentMethod = paymentMethod || 'cash_on_delivery';
        if (!validPaymentMethods.includes(finalPaymentMethod)) {
            console.error(`[${requestId}] Validation failed: Invalid payment method: ${paymentMethod}`);
            return res.status(400).json({ 
                message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
                requestId: requestId
            });
        }
        
        console.log(`[${requestId}] Step 1: Validating request payload - SUCCESS`);
        
        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            console.error(`[${requestId}] Database connection error: State = ${mongoose.connection.readyState}`);
            return res.status(500).json({ 
                message: 'Database connection error. Please try again later.',
                requestId: requestId
            });
        }
        
        console.log(`[${requestId}] Step 2: Database connection check - SUCCESS`);
        
        // Get user's cart
        console.log(`[${requestId}] Step 3: Fetching user cart...`);
        const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
        
        if (!cart) {
            console.error(`[${requestId}] Cart not found for user: ${req.user.id}`);
            return res.status(400).json({ 
                message: 'Cart not found. Please add items to your cart first.',
                requestId: requestId
            });
        }
        
        if (!cart.items || cart.items.length === 0) {
            console.error(`[${requestId}] Cart is empty`);
            return res.status(400).json({ 
                message: 'Cart is empty. Please add items to your cart before placing an order.',
                requestId: requestId
            });
        }
        
        console.log(`[${requestId}] Step 3: Cart found with ${cart.items.length} items - SUCCESS`);
        
        // Validate stock and prepare order items
        console.log(`[${requestId}] Step 4: Validating products and stock...`);
        const orderItems = [];
        
        for (let i = 0; i < cart.items.length; i++) {
            const cartItem = cart.items[i];
            const product = cartItem.product;
            
            console.log(`[${requestId}] Processing cart item ${i + 1}/${cart.items.length}:`, {
                productId: product?._id,
                productName: product?.name,
                quantity: cartItem.quantity
            });
            
            if (!product) {
                console.error(`[${requestId}] Product not found for cart item:`, cartItem);
                return res.status(400).json({ 
                    message: `Product in cart item ${i + 1} is no longer available. Please remove it and try again.`,
                    requestId: requestId
                });
            }
            
            if (!product.isActive) {
                console.error(`[${requestId}] Product is inactive:`, product.name);
                return res.status(400).json({ 
                    message: `Product "${product.name}" is no longer available. Please remove it from your cart.`,
                    requestId: requestId
                });
            }
            
            if (product.stock < cartItem.quantity) {
                console.error(`[${requestId}] Insufficient stock:`, {
                    product: product.name,
                    available: product.stock,
                    requested: cartItem.quantity
                });
                return res.status(400).json({ 
                    message: `Not enough stock for "${product.name}". Available: ${product.stock}, Requested: ${cartItem.quantity}`,
                    requestId: requestId
                });
            }
            
            const itemPrice = product.price * (1 - (product.discount || 0) / 100);
            orderItems.push({
                product: product._id,
                quantity: cartItem.quantity,
                price: product.price,
                discount: product.discount || 0,
                subtotal: itemPrice * cartItem.quantity
            });
        }
        
        console.log(`[${requestId}] Step 4: Products validated - SUCCESS (${orderItems.length} items)`);
        
        // Generate unique order number
        console.log(`[${requestId}] Step 5: Generating unique order number...`);
        let orderNumber = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!orderNumber && attempts < maxAttempts) {
            try {
                const orderCount = await Order.countDocuments();
                const date = new Date();
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const sequence = String(orderCount + 1 + attempts).padStart(6, '0');
                const candidateNumber = `ORD-${year}${month}${day}-${sequence}`;
                
                // Check if order number already exists
                const existing = await Order.findOne({ orderNumber: candidateNumber });
                if (!existing) {
                    orderNumber = candidateNumber;
                    console.log(`[${requestId}] Step 5: Order number generated - "${orderNumber}"`);
                } else {
                    console.warn(`[${requestId}] Order number collision, retrying... (attempt ${attempts + 1})`);
                    attempts++;
                }
            } catch (error) {
                console.error(`[${requestId}] Error generating order number:`, error);
                // Fallback to timestamp-based number
                const timestamp = Date.now();
                const random = Math.floor(Math.random() * 10000);
                orderNumber = `ORD-${timestamp}-${random}`;
                console.log(`[${requestId}] Step 5: Using fallback order number - "${orderNumber}"`);
                break;
            }
        }
        
        // Final validation - ensure orderNumber is a valid string
        if (!orderNumber) {
            const error = new Error('Failed to generate unique order number after multiple attempts');
            console.error(`[${requestId}] ${error.message}`);
            throw error;
        }
        
        if (typeof orderNumber !== 'string') {
            orderNumber = String(orderNumber);
            console.warn(`[${requestId}] Order number was not a string, converted to: "${orderNumber}"`);
        }
        
        if (orderNumber.trim() === '') {
            const error = new Error('Order number is empty after trimming');
            console.error(`[${requestId}] ${error.message}`);
            throw error;
        }
        
        console.log(`[${requestId}] Step 5: Order number validation passed - "${orderNumber}" (type: ${typeof orderNumber}, length: ${orderNumber.length})`);
        
        console.log(`[${requestId}] Step 6: Creating order document with orderNumber: "${orderNumber}"...`);
        
        // Create order with explicit orderNumber
        const orderData = {
            orderNumber: orderNumber,
            user: req.user.id,
            items: orderItems,
            shippingAddress: shippingAddress || {},
            billingAddress: billingAddress || shippingAddress || {},
            paymentMethod: finalPaymentMethod,
            notes: notes || ''
        };
        
        console.log(`[${requestId}] Order data before creation:`, JSON.stringify({
            ...orderData,
            items: orderData.items.map(i => ({ product: i.product.toString(), quantity: i.quantity }))
        }, null, 2));
        
        const order = new Order(orderData);
        
        // Verify orderNumber is set on the order object
        if (!order.orderNumber) {
            console.error(`[${requestId}] CRITICAL: orderNumber is missing from order object!`);
            console.error(`[${requestId}] Order object:`, order.toObject());
            throw new Error('Order number was not set on order object');
        }
        
        console.log(`[${requestId}] Order object created. orderNumber: "${order.orderNumber}"`);
        
        // CRITICAL: Ensure orderNumber is set before any operations
        if (!order.orderNumber || order.orderNumber.trim() === '') {
            console.error(`[${requestId}] CRITICAL ERROR: orderNumber is missing or empty!`);
            console.error(`[${requestId}] Order data:`, order.toObject());
            // Force set orderNumber as last resort
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 10000);
            order.orderNumber = `ORD-${timestamp}-${random}`;
            console.warn(`[${requestId}] Forced orderNumber to: "${order.orderNumber}"`);
        }
        
        console.log(`[${requestId}] Step 7: Calculating order totals...`);
        order.calculateTotals();
        
        // Final check before save
        console.log(`[${requestId}] Step 8: Final validation before save...`);
        console.log(`[${requestId}] Order orderNumber before save: "${order.orderNumber}" (type: ${typeof order.orderNumber})`);
        
        if (!order.orderNumber) {
            const error = new Error('Order number is still missing before save operation');
            console.error(`[${requestId}] ${error.message}`);
            throw error;
        }
        
        console.log(`[${requestId}] Step 8: Saving order to database...`);
        await order.save();
        console.log(`[${requestId}] Step 8: Order saved successfully - ID: ${order._id}`);
        
        // Update product stock
        console.log(`[${requestId}] Step 9: Updating product stock...`);
        for (const item of orderItems) {
            try {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity }
                });
                console.log(`[${requestId}] Stock updated for product: ${item.product}`);
            } catch (stockError) {
                console.error(`[${requestId}] Error updating stock for product ${item.product}:`, stockError);
                // Continue with other products even if one fails
            }
        }
        
        // Clear cart
        console.log(`[${requestId}] Step 10: Clearing cart...`);
        cart.items = [];
        await cart.save();
        console.log(`[${requestId}] Step 10: Cart cleared - SUCCESS`);
        
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ========== ORDER CREATION SUCCESS ==========`);
        console.log(`[${requestId}] Order Number: ${order.orderNumber}`);
        console.log(`[${requestId}] Order ID: ${order._id}`);
        console.log(`[${requestId}] Total: Rs. ${order.total}`);
        console.log(`[${requestId}] Duration: ${duration}ms`);
        console.log(`[${requestId}] ===========================================`);
        
        res.status(201).json({
            ...order.toObject(),
            requestId: requestId
        });
    } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`[${requestId}] ========== ORDER CREATION FAILED ==========`);
        console.error(`[${requestId}] Error Name:`, err.name);
        console.error(`[${requestId}] Error Message:`, err.message);
        console.error(`[${requestId}] Error Code:`, err.code);
        console.error(`[${requestId}] Error Stack:`, err.stack);
        console.error(`[${requestId}] Duration: ${duration}ms`);
        console.error(`[${requestId}] ===========================================`);
        
        // Provide more detailed error messages
        let errorMessage = err.message || 'Failed to create order';
        let statusCode = 500;
        
        // Handle specific error types
        if (err.name === 'ValidationError') {
            statusCode = 400;
            const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
            errorMessage = `Order validation failed: ${validationErrors}`;
            console.error(`[${requestId}] Validation errors:`, err.errors);
        } else if (err.code === 11000) {
            // Duplicate key error (unique constraint violation)
            statusCode = 409;
            errorMessage = 'Order number already exists. Please try again.';
            console.error(`[${requestId}] Duplicate key error - order number collision`);
        } else if (err.name === 'CastError') {
            statusCode = 400;
            errorMessage = `Invalid data format: ${err.message}`;
            console.error(`[${requestId}] Cast error:`, err.path, err.value);
        } else if (err.message && err.message.includes('database')) {
            statusCode = 503;
            errorMessage = 'Database error. Please try again later.';
            console.error(`[${requestId}] Database error detected`);
        }
        
        res.status(statusCode).json({ 
            message: errorMessage,
            requestId: requestId,
            error: process.env.NODE_ENV === 'development' ? {
                name: err.name,
                message: err.message,
                stack: err.stack
            } : undefined
        });
    }
});

// Get order by ID (authenticated users can view their own orders, guests can view by order number)
router.get('/:id', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .populate('items.product', 'name image price category department');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Format order to include customer info (similar to admin route)
        const orderObj = order.toObject();
        if (!order.user && order.guestCustomer) {
            orderObj.customer = {
                name: order.guestCustomer.name,
                email: order.guestCustomer.email,
                phone: order.guestCustomer.phone || order.shippingAddress?.phone || null,
                type: 'guest'
            };
        } else if (order.user) {
            orderObj.customer = {
                name: order.user.name,
                email: order.user.email,
                phone: order.user.phone || order.shippingAddress?.phone || null,
                type: 'user',
                userId: order.user._id
            };
        }
        
        const orderToReturn = orderObj;
        
        // If authenticated, check if user owns the order or is admin
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
                
                // Admin can view any order
                if (decoded.user.role === 'admin') {
                    return res.json(orderToReturn);
                }
                
                // User can view their own orders
                if (order.user && order.user._id.toString() === decoded.user.id) {
                    return res.json(orderToReturn);
                }
                
                // Guest orders cannot be viewed by authenticated users (unless admin)
                if (!order.user) {
                    return res.status(403).json({ message: 'Access denied' });
                }
                
                return res.status(403).json({ message: 'Access denied' });
            } catch (err) {
                // Invalid token, treat as guest
                // Guest orders can be viewed by anyone with order ID (for order confirmation)
                if (!order.user) {
                    return res.json(orderToReturn);
                }
                return res.status(401).json({ message: 'Authentication required' });
            }
        } else {
            // Guest access - can only view guest orders
            if (!order.user) {
                return res.json(orderToReturn);
            }
            return res.status(401).json({ message: 'Authentication required to view this order' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order status (admin only)
router.put('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status, cancelledReason } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        order.status = status;
        if (status === 'cancelled' && cancelledReason) {
            order.cancelledReason = cancelledReason;
            
            // Restore stock if order is cancelled
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: item.quantity }
                });
            }
        }
        
        await order.save();
        
        res.json(order);
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Confirm order (admin only)
router.post('/:id/confirm', adminAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.status !== 'pending') {
            return res.status(400).json({ message: `Order is already ${order.status}` });
        }
        
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        await order.save();
        
        res.json(order);
    } catch (err) {
        console.error('Confirm order error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;