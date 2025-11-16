## D.Watson E‑Commerce Website

Modern e‑commerce frontend + backend for D.Watson Pharmacy, built with **Node.js + Express + MongoDB** and a custom HTML/CSS/JS storefront.

### Features

- **Fast main page**: Static UI (hero slider, banners, navbar) renders instantly; products and sections load asynchronously via `fetch`.
- **Section‑based homepage**: Product carousels for Top Selling, Lingerie Collection, New Arrivals, Best Sellers, etc., driven by a `sections[]` field on each product.
- **Admin dashboard**: Manage departments, categories, products, banners, sliders, video banners, brand logos, and homepage sections.
- **Public catalog**:
  - Department pages (`/department/:id`) showing department info + categories + products.
  - Category pages (`/category/:id`) showing only that category’s products.
  - All‑products page (`/products`) with filters (department, category, price, sort).
- **Cart & orders**: Guest cart stored in `localStorage`, authenticated cart stored in MongoDB.
- **Live/local data sync**: Optional live MongoDB sync via `LIVE_MONGODB_URI` and sync scripts.

### Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Frontend**: HTML5, Bootstrap 5, custom CSS (`style.css`, `dwatson-styles.css`), vanilla JS
- **Auth**: JWT (admin), client‑side token storage

---

## Getting Started (Local)

### 1. Install prerequisites

- Node.js 18+  
- MongoDB (local instance) or MongoDB Atlas URI

### 2. Install dependencies

From the project root:

```bash
cd backend
npm install
cd ..
```

### 3. Configure environment

Create `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/dwatson_pk
LIVE_MONGODB_URI=              # optional, live MongoDB for sync
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@dwatson.pk
ADMIN_PASSWORD=admin123
NODE_ENV=development
PORT=5000
```

If `LIVE_MONGODB_URI` is set, the app will sync changes from local to live using the services in `backend/services/databaseSync.js`.

### 4. Seed / sync data (optional)

With MongoDB running:

```bash
cd backend
node scripts/populate-brands.js
node scripts/populate-products.js
node scripts/create-navbar-categories.js
# Sync local → live (if LIVE_MONGODB_URI is set)
node scripts/sync-all-data-to-live.js
cd ..
```

### 5. Run the app

```bash
cd backend
npm start
```

Open the storefront:

```text
http://localhost:5000
```

Admin dashboard:

```text
http://localhost:5000/admin
```

Log in with the admin email/password from `.env`.

---

## Key Backend Routes

- Public:
  - `GET /api/public/departments/:id` – Department + its categories + products
  - `GET /api/public/categories/:id` – Category + its products
  - `GET /api/public/products` – Filtered products (department, category, price, filter, section)
  - `GET /api/public/products/home?limit=20` – Lightweight homepage products (used for fast skeleton replacement)
  - `GET /api/homepage-sections/public` – Published homepage sections
- Admin:
  - `GET/POST/PUT/DELETE /api/departments`
  - `GET/POST/PUT/DELETE /api/categories`
  - `GET/POST/PUT/DELETE /api/products`
  - `GET/POST/PUT/DELETE /api/banners`
  - `GET/POST/PUT/DELETE /api/sliders`
  - `GET/POST/PUT/DELETE /api/admin/brands`
  - `GET/POST/PUT/DELETE /api/admin/video-banners`
  - `GET/POST/PUT/DELETE /api/homepage-sections`

---

## Homepage Performance Design

- Static HTML and CSS (hero, banners, nav) are served directly from Express with long‑term caching.
- JS is loaded with `defer`; main initialization happens after `DOMContentLoaded` using `requestIdleCallback` when available.
- Homepage sections and banners are fetched via:
  - `loadAndRenderHomepageSections()` → `/api/homepage-sections/public`
  - `loadAndRenderBanners()` → `/api/banners`
- Legacy fallback sections render skeleton product cards immediately; `loadFallbackHomepageProducts()` later calls:
  - `GET /api/public/products/home?limit=20`
  - Replaces skeletons in `Trending`, `Deals`, and `New Arrivals` with real product cards using a `.fade-in` transition.

---

## Deployment Notes

- Set `MONGODB_URI` to your production MongoDB (Atlas or managed instance).
- Optionally set `LIVE_MONGODB_URI` to a separate live database and use `scripts/sync-all-data-to-live.js` for one‑time sync.
- The app is Procfile‑ready for platforms like Heroku/Railway.

---

**Built and designed by Bilal Shah. All rights reserved by D.Watson.**