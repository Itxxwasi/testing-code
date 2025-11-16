const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dwatson_pk');

        console.log('MongoDB connected');
        console.log('Creating/updating admin user...\n');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@dwatson.pk';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminName = process.env.ADMIN_NAME || 'Admin';

        // Check if admin user exists
        let adminUser = await User.findOne({ email: adminEmail.toLowerCase().trim() });

        if (adminUser) {
            // Update existing user to ensure it's an admin
            adminUser.role = 'admin';
            adminUser.isActive = true;
            adminUser.name = adminName;
            
            // Update password if ADMIN_PASSWORD is set
            if (process.env.ADMIN_PASSWORD) {
                adminUser.password = adminPassword;
            }
            
            await adminUser.save();
            console.log(`✓ Updated admin user: ${adminEmail}`);
            console.log(`  Role: ${adminUser.role}`);
            console.log(`  Name: ${adminUser.name}`);
            if (process.env.ADMIN_PASSWORD) {
                console.log(`  Password: ${adminPassword}`);
            }
        } else {
            // Create new admin user
            adminUser = await User.create({
                name: adminName,
                email: adminEmail.toLowerCase().trim(),
                password: adminPassword,
                role: 'admin',
                isActive: true
            });
            console.log(`✓ Created admin user: ${adminEmail}`);
            console.log(`  Role: ${adminUser.role}`);
            console.log(`  Name: ${adminUser.name}`);
            console.log(`  Password: ${adminPassword}`);
        }

        console.log('\n✅ Admin user ready!');
        console.log('\nLogin credentials:');
        console.log(`  Email: ${adminEmail}`);
        console.log(`  Password: ${adminPassword}`);

    } catch (error) {
        console.error('❌ Failed to create/update admin user', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB disconnected');
        process.exit(0);
    }
}

run();

