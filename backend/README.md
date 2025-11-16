# D.Watson Pharmacy - Backend API

Production-ready backend for D.Watson Pharmacy E-Commerce platform.

## Heroku Deployment

### Prerequisites
- Heroku account
- MongoDB Atlas account (or other MongoDB hosting)
- Node.js 14+ installed locally

### Deployment Steps

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_connection_string
   heroku config:set JWT_SECRET=your_jwt_secret_key
   heroku config:set PORT=5000
   heroku config:set ADMIN_EMAIL=admin@dwatson.pk
   heroku config:set ADMIN_PASSWORD=your_admin_password
   heroku config:set CONTACT_EMAIL=dwatsononline.co@gmail.com
   
   # Optional: Email configuration (choose one)
   # Option 1: SendGrid (Recommended)
   heroku config:set SENDGRID_API_KEY=your_sendgrid_api_key
   
   # Option 2: Generic SMTP
   heroku config:set SMTP_HOST=smtp.gmail.com
   heroku config:set SMTP_PORT=587
   heroku config:set SMTP_SECURE=false
   heroku config:set SMTP_USER=your_email@gmail.com
   heroku config:set SMTP_PASS=your_app_password
   ```

5. **Deploy**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

6. **Open App**
   ```bash
   heroku open
   ```

## Environment Variables

Required:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `ADMIN_EMAIL` - Admin login email
- `ADMIN_PASSWORD` - Admin login password
- `CONTACT_EMAIL` - Email to receive contact form messages

Optional (Email):
- `SENDGRID_API_KEY` - SendGrid API key (recommended)
- OR `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Generic SMTP settings

## API Endpoints

- `/api/auth/*` - Authentication
- `/api/admin/*` - Admin operations
- `/api/products/*` - Product management
- `/api/cart/*` - Shopping cart
- `/api/orders/*` - Order management
- `/api/contact` - Contact form

## Scripts

Database initialization scripts are in `scripts/` folder:
- `database-init.js` - Initialize database with sample data (clears all data)
- `add-sample-products.js` - Add sample products to existing categories
- `restore-main-page-data.js` - Restore/maintain homepage sections, sliders, and banners (preserves existing data)
- `update-hero-sliders.js` - Update hero section with active sliders
- `migrate-media.js` - Migrate media files
- `populate-navbar-categories.js` - Create/update navbar categories (Makeup, Skin Care, Hair Care, etc.)
- `setup-homepage-sections-admin.js` - Setup homepage sections to match admin dashboard (9 sections: Announcement Bar, Hero Slider, Featured Categories, Featured Products, Promotional Banner, Trending Products, Category Icons, Newsletter Signup, Brand Logos)

Run locally:
```bash
# Initialize complete database (clears all data)
node scripts/database-init.js

# Setup homepage sections matching admin dashboard
node scripts/setup-homepage-sections-admin.js

# Populate navbar categories
node scripts/populate-navbar-categories.js

# Create/update admin user (ensures admin exists with correct role)
node scripts/create-admin-user.js

# Restore only main page data (preserves products, departments, categories, users)
node scripts/restore-main-page-data.js

# Add sample products
node scripts/add-sample-products.js
```

