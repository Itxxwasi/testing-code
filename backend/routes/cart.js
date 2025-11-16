const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Get user's cart
router.get('/', auth, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                populate: {
                    path: 'category',
                    model: 'Category'
                }
            });
        
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
            await cart.save();
        }
        
        // Filter out items with null products (deleted products)
        const validItems = cart.items.filter(item => item.product !== null && item.product !== undefined);
        
        // If there are invalid items, update the cart
        if (validItems.length !== cart.items.length) {
            cart.items = validItems;
            await cart.save();
        }
        
        const total = cart.calculateTotal();
        const totalItems = cart.getTotalItems();
        
        res.json({ 
            items: validItems,
            total: total,
            totalItems: totalItems
        });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get cart item count
router.get('/count', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        const count = cart ? cart.getTotalItems() : 0;
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }
        
        // Check if product exists and is active
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }
        
        // Find or create cart
        let cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [] });
        }
        
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );
        
        const requestedQuantity = parseInt(quantity, 10);
        const currentQuantity = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
        const newQuantity = currentQuantity + requestedQuantity;
        
        // Check stock availability
        if (product.stock < newQuantity) {
            return res.status(400).json({ 
                message: `Not enough stock. Available: ${product.stock}, Requested: ${newQuantity}` 
            });
        }
        
        if (existingItemIndex >= 0) {
            // Update existing item
            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].price = product.price;
            cart.items[existingItemIndex].discount = product.discount || 0;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity: requestedQuantity,
                price: product.price,
                discount: product.discount || 0
            });
        }
        
        await cart.save();
        
        const totalItems = cart.getTotalItems();
        
        const response = { 
            message: 'Product added to cart',
            totalItems: totalItems,
            success: true
        };
        
        console.log('Add to cart response:', response);
        
        res.json(response);
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update item quantity in cart
router.put('/update', auth, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        if (!productId || quantity === undefined) {
            return res.status(400).json({ message: 'Product ID and quantity are required' });
        }
        
        const requestedQuantity = parseInt(quantity, 10);
        if (requestedQuantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }
        
        // Check if product exists and is in stock
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }
        
        if (product.stock < requestedQuantity) {
            return res.status(400).json({ 
                message: `Not enough stock. Available: ${product.stock}, Requested: ${requestedQuantity}` 
            });
        }
        
        // Find cart
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Find item in cart
        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );
        
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        
        // Update quantity
        cart.items[itemIndex].quantity = requestedQuantity;
        cart.items[itemIndex].price = product.price;
        cart.items[itemIndex].discount = product.discount || 0;
        
        await cart.save();
        
        const total = cart.calculateTotal();
        const totalItems = cart.getTotalItems();
        
        res.json({ 
            message: 'Cart updated',
            total: total,
            totalItems: totalItems
        });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Remove item from cart
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Find cart
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Remove item
        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );
        
        await cart.save();
        
        const totalItems = cart.getTotalItems();
        
        res.json({ 
            message: 'Item removed from cart',
            totalItems: totalItems
        });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Clear entire cart
router.delete('/clear', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        cart.items = [];
        await cart.save();
        
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;