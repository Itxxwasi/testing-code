const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'Please provide name, email, and password' 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Please provide a valid email address' 
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        // Create new user
        user = new User({
            name,
            email,
            password,
            phone: phone || undefined
        });
        
        await user.save();
        
        // Create JWT token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };
        
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'default_secret',
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ message: 'Server error during registration' });
                }
                res.status(201).json({ 
                    token,
                    message: 'Registration successful',
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Registration error:', err.message);
        
        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: `Validation error: ${errors}` });
        }
        
        // Handle duplicate key error
        if (err.code === 11000) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        // Check database connection
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.error('Database not connected. State:', mongoose.connection.readyState);
            return res.status(503).json({ 
                message: 'Database connection error. Please try again later.' 
            });
        }
        
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }
        
        console.log('Login attempt for:', email);
        
        // Check if user exists
        let user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check if user is active
        if (!user.isActive) {
            console.log('User account deactivated:', email);
            return res.status(403).json({ message: 'Account is deactivated' });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Invalid password for:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check JWT_SECRET
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not set in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }
        
        // Create JWT token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };
        
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ message: 'Server error during login' });
                }
                console.log('Login successful for:', email);
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('========== LOGIN ERROR ==========');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        console.error('Error Stack:', err.stack);
        console.error('================================');
        
        res.status(500).json({ 
            message: 'Server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;