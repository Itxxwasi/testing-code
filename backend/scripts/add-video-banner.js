/**
 * Add Video Banner Script
 * Adds YouTube video banner to database and creates homepage section
 */

const mongoose = require('mongoose');
require('dotenv').config();

const VideoBanner = require('../models/VideoBanner');
const HomepageSection = require('../models/HomepageSection');

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
    // Handle various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/.*[?&]v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

// Convert YouTube URL to embed format
function getYouTubeEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
}

async function addVideoBanner() {
    try {
        const localURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk';
        await mongoose.connect(localURI);
        console.log('✅ Connected to database\n');

        const youtubeUrl = 'https://youtu.be/otej7WLdPh0?si=8e7sGb93elLZJybF';
        const videoId = extractYouTubeId(youtubeUrl);
        
        if (!videoId) {
            console.error('❌ Could not extract YouTube video ID from URL:', youtubeUrl);
            process.exit(1);
        }

        console.log('='.repeat(70));
        console.log('ADDING VIDEO BANNER');
        console.log('='.repeat(70) + '\n');
        console.log(`YouTube URL: ${youtubeUrl}`);
        console.log(`Video ID: ${videoId}\n`);

        // Check if video banner already exists
        let videoBanner = await VideoBanner.findOne({ videoUrl: { $regex: videoId } });
        
        if (videoBanner) {
            console.log('⚠️  Video banner with this video already exists, updating...');
            videoBanner.title = 'D.Watson Promotional Video';
            videoBanner.description = 'Watch our latest promotional video showcasing our products and services';
            videoBanner.videoUrl = youtubeUrl;
            videoBanner.videoType = 'youtube';
            videoBanner.isActive = true;
            videoBanner.order = 0;
            videoBanner.autoplay = true;
            videoBanner.loop = true;
            videoBanner.muted = true;
            videoBanner.controls = true;
            await videoBanner.save();
            console.log('✅ Updated existing video banner');
        } else {
            // Create new video banner
            videoBanner = await VideoBanner.create({
                title: 'D.Watson Promotional Video',
                description: 'Watch our latest promotional video showcasing our products and services',
                videoUrl: youtubeUrl,
                videoType: 'youtube',
                isActive: true,
                order: 0,
                autoplay: true,
                loop: true,
                muted: true,
                controls: true,
                buttonText: 'Shop Now',
                buttonLink: '/products'
            });
            console.log('✅ Created new video banner');
        }

        console.log('\nVideo Banner Details:');
        console.log(`  ID: ${videoBanner._id}`);
        console.log(`  Title: ${videoBanner.title}`);
        console.log(`  Video URL: ${videoBanner.videoUrl}`);
        console.log(`  Video Type: ${videoBanner.videoType}`);
        console.log(`  Active: ${videoBanner.isActive}`);
        console.log(`  Autoplay: ${videoBanner.autoplay}`);
        console.log(`  Loop: ${videoBanner.loop}`);
        console.log(`  Muted: ${videoBanner.muted}`);
        console.log(`  Controls: ${videoBanner.controls}`);

        // Create or update homepage section for video banner
        let videoSection = await HomepageSection.findOne({ type: 'videoBanner', isActive: true });
        
        if (videoSection) {
            console.log('\n⚠️  Video banner homepage section already exists, updating...');
            videoSection.config = {
                videoBannerId: videoBanner._id.toString()
            };
            videoSection.isActive = true;
            videoSection.isPublished = true;
            videoSection.ordering = 2; // Show early on homepage
            await videoSection.save();
            console.log('✅ Updated existing video banner section');
        } else {
            videoSection = await HomepageSection.create({
                name: 'Promotional Video',
                type: 'videoBanner',
                title: 'Watch Our Story',
                subtitle: 'Discover D.Watson',
                description: 'Experience our commitment to quality and service',
                ordering: 2, // Show early on homepage (after hero slider)
                isActive: true,
                isPublished: true,
                config: {
                    videoBannerId: videoBanner._id.toString()
                }
            });
            console.log('✅ Created new video banner homepage section');
        }

        console.log('\nHomepage Section Details:');
        console.log(`  ID: ${videoSection._id}`);
        console.log(`  Name: ${videoSection.name}`);
        console.log(`  Type: ${videoSection.type}`);
        console.log(`  Ordering: ${videoSection.ordering}`);
        console.log(`  Active: ${videoSection.isActive}`);
        console.log(`  Published: ${videoSection.isPublished}`);
        console.log(`  Config:`, JSON.stringify(videoSection.config, null, 2));

        console.log('\n' + '='.repeat(70));
        console.log('✅ VIDEO BANNER SUCCESSFULLY ADDED!');
        console.log('='.repeat(70));
        console.log('\nThe video banner will now appear on:');
        console.log('  ✅ Database (VideoBanner collection)');
        console.log('  ✅ Admin Dashboard (/admin)');
        console.log('  ✅ Main Page (Homepage)');
        console.log('\nNext steps:');
        console.log('  1. Clear browser cache (Ctrl+Shift+Delete)');
        console.log('  2. Visit the homepage to see the video banner');
        console.log('  3. Check admin dashboard to manage the video banner');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n📴 Database connection closed');
        process.exit(0);
    }
}

addVideoBanner();

