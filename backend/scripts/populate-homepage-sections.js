const mongoose = require('mongoose');
require('dotenv').config();

const HomepageSection = require('../models/HomepageSection');
const Slider = require('../models/Slider');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Department = require('../models/Department');

async function run() {
    let exitCode = 0;
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk');

        console.log('MongoDB connected');
        console.log('Starting homepage sections population with dummy data...\n');

        // Step 1: Create or update Hero Sliders with images
        console.log('Step 1: Creating/updating hero sliders with images...');
        const heroSlides = [];

        const sliderData = [
            {
                title: 'URBAN Care',
                description: 'URBAN CARE LUXURY HAIR & BODY CARE - NOURISH. REPAIR. SHINE',
                image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1600&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=800&q=80',
                link: '/products?filter=new',
                buttonText: 'Shop Now',
                buttonLink: '/products?filter=new',
                order: 1,
                isActive: true
            },
            {
                title: '11.11 Mega Sale',
                description: 'Get Upto 50% OFF on all cosmetics & skincare products',
                image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1600&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=800&q=80',
                link: '/products?filter=discounted',
                buttonText: 'Shop Sale',
                buttonLink: '/products?filter=discounted',
                order: 2,
                isActive: true
            },
            {
                title: 'New Arrivals - Luxury Fragrances',
                description: 'Discover the latest perfume collections from top brands',
                image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1600&q=80',
                imageMobile: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
                link: '/products?filter=new',
                buttonText: 'Explore',
                buttonLink: '/products?filter=new',
                order: 3,
                isActive: true
            }
        ];

        for (const data of sliderData) {
            let slider = await Slider.findOne({ title: data.title });
            if (slider) {
                Object.assign(slider, data);
                await slider.save();
                console.log(`  ✓ Updated slider: "${data.title}"`);
            } else {
                slider = await Slider.create(data);
                console.log(`  ✓ Created slider: "${data.title}"`);
            }
            heroSlides.push(slider._id.toString());
        }
        console.log('  ✓ Hero sliders ready\n');

        // Step 2: Get or create departments with images
        console.log('Step 2: Preparing departments with images...');
        let departments = await Department.find({ isActive: true }).limit(10);
        
        // If no departments exist, create dummy ones
        if (departments.length === 0) {
            console.log('  No departments found, creating dummy departments...');
            const dummyDepartments = [
                {
                    name: 'Cosmetics',
                    description: 'Makeup, Skincare & Beauty Products',
                    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
                    isActive: true
                },
                {
                    name: 'Fragrances',
                    description: 'Perfumes & Colognes for Men & Women',
                    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
                    isActive: true
                },
                {
                    name: 'Skincare',
                    description: 'Face Care & Body Care Products',
                    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
                    isActive: true
                },
                {
                    name: 'Hair Care',
                    description: 'Shampoo, Conditioner & Hair Treatment',
                    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
                    isActive: true
                },
                {
                    name: 'Men\'s Grooming',
                    description: 'Skincare & Grooming for Men',
                    image: 'https://images.unsplash.com/photo-1582095133173-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80',
                    isActive: true
                }
            ];

            for (const deptData of dummyDepartments) {
                const dept = await Department.create(deptData);
                console.log(`  ✓ Created department: "${deptData.name}"`);
            }
            
            // Refresh departments
            departments = await Department.find({ isActive: true }).limit(10);
        }
        console.log(`  ✓ Departments ready: ${departments.length}\n`);

        // Step 3: Get or create categories with images
        console.log('Step 3: Preparing categories with images...');
        let categories = await Category.find({ isActive: true }).limit(8);
        let categoryIds = [];
        
        // If no categories exist, create dummy ones linked to first department
        if (categories.length === 0 && departments.length > 0) {
            console.log('  No categories found, creating dummy categories...');
            const firstDeptId = departments[0]._id;
            const dummyCategories = [
                {
                    name: 'Makeup',
                    description: 'Foundation, Lipstick, Eyeshadow & More',
                    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
                    department: firstDeptId,
                    isActive: true,
                    isFeatured: true
                },
                {
                    name: 'Face Care',
                    description: 'Cleanser, Toner, Moisturizer & More',
                    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
                    department: firstDeptId,
                    isActive: true,
                    isFeatured: true
                },
                {
                    name: 'Perfumes',
                    description: 'Perfumes for Men & Women',
                    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
                    department: departments.length > 1 ? departments[1]._id : firstDeptId,
                    isActive: true,
                    isFeatured: true
                },
                {
                    name: 'Hair Care',
                    description: 'Shampoo, Conditioner & Hair Treatment',
                    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
                    department: firstDeptId,
                    isActive: true,
                    isFeatured: true
                },
                {
                    name: 'Nail Care',
                    description: 'Nail Polish & Nail Treatment',
                    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
                    department: firstDeptId,
                    isActive: true,
                    isFeatured: true
                },
                {
                    name: 'Body Care',
                    description: 'Body Lotion, Soap & More',
                    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=800&q=80',
                    department: firstDeptId,
                    isActive: true,
                    isFeatured: true
                }
            ];

            for (const catData of dummyCategories) {
                const cat = await Category.create(catData);
                console.log(`  ✓ Created category: "${catData.name}"`);
            }
            
            // Refresh categories
            categories = await Category.find({ isActive: true }).limit(8);
        }
        
        if (categories.length > 0) {
            categoryIds = categories.map(c => c._id.toString());
        }
        console.log(`  ✓ Categories ready: ${categoryIds.length}\n`);

        // Step 4: Create or update Homepage Sections
        console.log('Step 4: Creating/updating homepage sections...');

        // Clear existing sections
        await HomepageSection.deleteMany({});
        console.log('  ✓ Cleared existing homepage sections');

        const sections = [];

        // 1. Hero Slider Section (After scrolling text)
        const heroSliderSection = await HomepageSection.create({
            name: 'Hero Slider',
            type: 'heroSlider',
            title: '',
            ordering: 2, // Show after scrolling text
            isActive: true,
            isPublished: true,
            config: {
                sliderIds: heroSlides,
                autoplay: true,
                autoplaySpeed: 5000,
                showArrows: true,
                showDots: true
            }
        });
        sections.push(heroSliderSection);
        console.log('  ✓ Created: Hero Slider Section');

        // 2. Scrolling Text Section (Top announcement bar with 50% OFF)
        const scrollingTextSection = await HomepageSection.create({
            name: 'Announcement Bar',
            type: 'scrollingText',
            ordering: 1, // Show FIRST before hero slider
            isActive: true,
            isPublished: true,
            config: {
                items: [
                    'Get Upto 50% OFF',
                    '11.11 Sale is Live'
                ],
                scrollSpeed: 12,
                backgroundColor: '#ffffff', // WHITE background for top slides
                textColor: '#d93939' // RED font color for slides
            }
        });
        sections.push(scrollingTextSection);
        console.log('  ✓ Created: Scrolling Text Section');

        // 3. Category Featured Grid (Trading Items)
        if (categoryIds.length >= 4) {
            const categoryFeaturedSection = await HomepageSection.create({
                name: 'Trading Items',
                type: 'categoryFeatured',
                title: 'Trading Items',
                subtitle: '',
                ordering: 3,
                isActive: true,
                isPublished: true,
                config: {
                    categoryIds: categoryIds.slice(0, 4),
                    gridColumns: 4,
                    showTitle: true
                }
            });
            sections.push(categoryFeaturedSection);
            console.log('  ✓ Created: Trading Items Section');
        }

        // 4. Product Tabs Section (New Arrivals)
        const productTabsSection = await HomepageSection.create({
            name: 'New Arrivals',
            type: 'productTabs',
            title: 'New Arrivals',
            subtitle: '',
            ordering: 4,
            isActive: true,
            isPublished: true,
            config: {
                tabs: [
                    { label: 'New Arrivals', filter: 'new', limit: 8 },
                    { label: 'Best Sellers', filter: 'trending', limit: 8 },
                    { label: 'On Sale', filter: 'discounted', limit: 8 }
                ]
            }
        });
        sections.push(productTabsSection);
        console.log('  ✓ Created: New Arrivals Section');

        // 5. Banner Full Width
        const bannerData = {
            title: 'Summer Collection',
            description: 'Discover our latest summer beauty essentials',
            image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1600&q=80',
            link: '/products?filter=new',
            position: 'middle',
            isActive: true
        };

        let banner = await Banner.findOne({ position: 'middle' });
        if (!banner) {
            banner = await Banner.create(bannerData);
        } else {
            Object.assign(banner, bannerData);
            await banner.save();
        }

        const bannerSection = await HomepageSection.create({
            name: 'Promotional Banner',
            type: 'bannerFullWidth',
            ordering: 5,
            isActive: true,
            isPublished: true,
            config: {
                bannerId: banner._id.toString()
            }
        });
        sections.push(bannerSection);
        console.log('  ✓ Created: Banner Full Width Section');

        // 6. Product Carousel (Product Feature Collection)
        const productCarouselSection = await HomepageSection.create({
            name: 'Product Feature Collection',
            type: 'productCarousel',
            title: 'Product Feature Collection',
            subtitle: '',
            ordering: 6,
            isActive: true,
            isPublished: true,
            config: {
                filter: 'trending',
                limit: 12,
                showArrows: true
            }
        });
        sections.push(productCarouselSection);
        console.log('  ✓ Created: Product Feature Collection Section');

        // 7. Category Circles (Popular Categories)
        if (categoryIds.length >= 6) {
            const categoryCirclesSection = await HomepageSection.create({
                name: 'Popular Categories',
                type: 'categoryCircles',
                title: 'Popular Categories',
                subtitle: '',
                ordering: 7,
                isActive: true,
                isPublished: true,
                config: {
                    categoryIds: categoryIds.slice(0, 6),
                    showTitle: true
                }
            });
            sections.push(categoryCirclesSection);
            console.log('  ✓ Created: Popular Categories Section');
        }

        // 8. Newsletter & Social Section
        const newsletterSection = await HomepageSection.create({
            name: 'Newsletter Signup',
            type: 'newsletterSocial',
            title: 'Stay in the Know',
            subtitle: 'Subscribe to get updates and exclusive offers',
            ordering: 8,
            isActive: true,
            isPublished: true,
            config: {
                socialLinks: [
                    { platform: 'facebook', url: 'https://facebook.com' },
                    { platform: 'instagram', url: 'https://instagram.com' },
                    { platform: 'twitter', url: 'https://twitter.com' }
                ]
            }
        });
        sections.push(newsletterSection);
        console.log('  ✓ Created: Newsletter & Social Section');

        // 9. Brand Marquee (Top Brands)
        const brandMarqueeSection = await HomepageSection.create({
            name: 'Top Brands',
            type: 'brandMarquee',
            title: 'Top Brands',
            subtitle: '',
            ordering: 9,
            isActive: true,
            isPublished: true,
            config: {
                logos: [
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Logo-maybelline.svg/2560px-Logo-maybelline.svg.png', alt: 'Maybelline' },
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/L%27Or%C3%A9al_logo.svg/512px-L%27Or%C3%A9al_logo.svg.png', alt: 'L\'Oréal' },
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/The_Ordinary_logo.svg/512px-The_Ordinary_logo.svg.png', alt: 'The Ordinary' },
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Clinique_logo.svg/512px-Clinique_logo.svg.png', alt: 'Clinique' },
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Garnier_logo.svg/320px-Garnier_logo.svg.png', alt: 'Garnier' },
                    { image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Neutrogena_logo.svg/512px-Neutrogena_logo.svg.png', alt: 'Neutrogena' }
                ]
            }
        });
        sections.push(brandMarqueeSection);
        console.log('  ✓ Created: Top Brands Section');

        // 10. Top Selling Products Section
        const topSellingSection = await HomepageSection.create({
            name: 'Top Selling Product',
            type: 'productCarousel',
            title: 'Top Selling Product',
            subtitle: '',
            ordering: 10,
            isActive: true,
            isPublished: true,
            config: {
                filter: 'trending',
                limit: 8,
                showArrows: true
            }
        });
        sections.push(topSellingSection);
        console.log('  ✓ Created: Top Selling Product Section');

        // 11. Lingerie Collection Section (if categories exist)
        if (categoryIds.length >= 1) {
            const lingerieSection = await HomepageSection.create({
                name: 'Lingerie Collection',
                type: 'categoryFeatured',
                title: 'Lingerie Collection',
                subtitle: '',
                ordering: 11,
                isActive: true,
                isPublished: true,
                config: {
                    categoryIds: categoryIds.slice(0, 4),
                    gridColumns: 4,
                    showTitle: true
                }
            });
            sections.push(lingerieSection);
            console.log('  ✓ Created: Lingerie Collection Section');
        }

        console.log('\n✅ Homepage sections population completed successfully!');
        console.log('\nSummary:');
        console.log(`  - Homepage Sections: ${sections.length}`);
        console.log(`  - Hero Sliders: ${heroSlides.length}`);
        console.log(`  - Categories Used: ${categoryIds.length}`);
        console.log(`  - Banners: 1`);

    } catch (error) {
        exitCode = 1;
        console.error('\n❌ Failed to populate homepage sections\n');
        
        if (error.name === 'MongooseServerSelectionError') {
            console.error('MongoDB Connection Error:');
            console.error('  - Could not connect to MongoDB database');
            console.error('  - Check your MONGODB_URI in .env file');
            console.error('  - Ensure your IP is whitelisted in MongoDB Atlas (if using Atlas)');
            console.error('  - Verify database credentials are correct\n');
            console.error('Error details:', error.message);
        } else {
            console.error('Error:', error.message);
            if (error.stack) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }
        }
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('\nMongoDB disconnected');
        }
        process.exit(exitCode);
    }
}

run();

