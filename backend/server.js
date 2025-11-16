const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const sliderRoutes = require('./routes/sliders');
const bannerRoutes = require('./routes/banners');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const mediaRoutes = require('./routes/media');
const mediaPublicRoutes = require('./routes/media-public');
const homepageSectionsRoutes = require('./routes/homepage-sections');
const reportsRoutes = require('./routes/reports');
const brandsRoutes = require('./routes/brands');
const videoBannersRoutes = require('./routes/video-banners');
const departmentsPublicRoutes = require('./routes/departments-public');
const categoriesPublicRoutes = require('./routes/categories-public');
const productsPublicRoutes = require('./routes/products-public');
const contactRoutes = require('./routes/contact');

// Initialize Express app
const app = express();

// Compression middleware for faster responses
const compression = require('compression');

// Middleware
app.use(compression()); // Compress all responses
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with aggressive caching (like Shopify CDN)
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: '1y', // Cache for 1 year
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache CSS/JS/images aggressively
        if (filePath.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Cache HTML less aggressively
        if (filePath.match(/\.html$/)) {
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, './uploads'), {
    maxAge: '1y',
    etag: true,
    lastModified: true
}));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
const dbSync = require('./services/databaseSync');

if (!process.env.MONGODB_URI) {
    console.log('ℹ️  Using default local MongoDB: mongodb://localhost:27017/dwatson_pk');
}

// Connect to local database (primary)
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(async () => {
    console.log('✅ Local MongoDB connected successfully');
    
    // Initialize live database connection for syncing
    if (process.env.LIVE_MONGODB_URI) {
        await dbSync.initLiveConnection();
    }
    
    // Load models (this sets up auto-sync hooks)
    require('./models/index');
    
    // Ensure admin user exists
    const User = require('./models/User');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@dwatson.pk';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    try {
        const adminUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });
        if (!adminUser) {
            console.log('📝 Creating admin user...');
            const newAdmin = await User.create({
                name: 'Admin',
                email: adminEmail.toLowerCase().trim(),
                password: adminPassword,
                role: 'admin',
                isActive: true
            });
            console.log(`✅ Admin user created: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);
            // Auto-sync will happen via post-save hook
        } else {
            console.log(`✅ Admin user already exists: ${adminEmail}`);
        }
    } catch (error) {
        console.error('❌ Error ensuring admin user:', error.message);
        console.error('   Stack:', error.stack);
    }
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Make sure MONGODB_URI is set correctly');
    console.error('   Error details:', err);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbStates = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
            state: dbStates[dbState] || 'unknown',
            readyState: dbState
        },
        environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            hasMongoUri: !!process.env.MONGODB_URI,
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasAdminEmail: !!process.env.ADMIN_EMAIL
        }
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/media', mediaRoutes);
app.use('/api/media', mediaPublicRoutes);
// LEGACY SECTIONS - NO LONGER USED
// app.use('/api/admin/sections', adminSectionRoutes);
// app.use('/api/sections', publicSectionsRoutes);
app.use('/api/homepage-sections', homepageSectionsRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/brands', brandsRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/admin/video-banners', videoBannersRoutes);
app.use('/api/video-banners', videoBannersRoutes);
app.use('/api/public/departments', departmentsPublicRoutes);
app.use('/api/public/categories', categoriesPublicRoutes);
app.use('/api/public/products', productsPublicRoutes);
app.use('/api/contact', contactRoutes);

// Admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Cart page route
app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/cart.html'));
});

app.get('/cart.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/cart.html'));
});

// Department page route (must be after static files but before catch-all)
app.get('/department/:id', (req, res) => {
    const id = req.params.id;
    // Only serve HTML if it looks like an ID (ObjectId format or simple string without file extension)
    // Reject if it contains a dot (likely a file request like .js, .css, etc.)
    if (id.includes('.') || id.includes('/')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '../frontend/department.html'));
});

// Category page route
app.get('/category/:id', (req, res) => {
    const id = req.params.id;
    if (id.includes('.') || id.includes('/')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '../frontend/category.html'));
});

// Products page route
app.get('/products', (req, res) => {
    if (req.path.includes('.')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '../frontend/products.html'));
});

// Product detail page route
app.get('/product/:id', (req, res) => {
    const id = req.params.id;
    if (id.includes('.') || id.includes('/')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '../frontend/product.html'));
});

// About Us page route
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about.html'));
});

// Contact page route
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

// Login page route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Register page route
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Catch-all handler to serve the frontend for any non-API routes
app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));