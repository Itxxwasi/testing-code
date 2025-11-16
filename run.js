#!/usr/bin/env node

/**
 * D.Watson Pharmacy - Project Runner
 * 
 * This script installs dependencies and runs the entire project.
 * It handles both backend and frontend setup.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
        log(`❌ Node.js version ${nodeVersion} is not supported. Please install Node.js 14 or higher.`, 'red');
        process.exit(1);
    }
    
    log(`✓ Node.js version ${nodeVersion} is compatible`, 'green');
}

function checkBackendDependencies() {
    const backendPath = path.join(__dirname, 'backend');
    const nodeModulesPath = path.join(backendPath, 'node_modules');
    const packageJsonPath = path.join(backendPath, 'package.json');
    
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
        log('❌ package.json not found in backend directory', 'red');
        process.exit(1);
    }
    
    // Check if node_modules exists and has content
    if (!fs.existsSync(nodeModulesPath)) {
        log('📦 Backend dependencies not found. Installing...', 'yellow');
        try {
            log('Installing backend dependencies (this may take a few minutes)...', 'blue');
            execSync('npm install', { 
                cwd: backendPath, 
                stdio: 'inherit',
                shell: true,
                env: process.env
            });
            log('✓ Backend dependencies installed successfully', 'green');
        } catch (error) {
            log('❌ Failed to install backend dependencies', 'red');
            log(`Error: ${error.message}`, 'red');
            process.exit(1);
        }
    } else {
        // Check if node_modules is actually populated (not just empty directory)
        try {
            const modules = fs.readdirSync(nodeModulesPath);
            if (modules.length === 0) {
                log('📦 node_modules directory is empty. Installing dependencies...', 'yellow');
                execSync('npm install', { 
                    cwd: backendPath, 
                    stdio: 'inherit',
                    shell: true,
                    env: process.env
                });
                log('✓ Backend dependencies installed successfully', 'green');
            } else {
                log('✓ Backend dependencies already installed', 'green');
            }
        } catch (error) {
            log('⚠️  Could not verify dependencies. Attempting to install...', 'yellow');
            try {
                execSync('npm install', { 
                    cwd: backendPath, 
                    stdio: 'inherit',
                    shell: true,
                    env: process.env
                });
                log('✓ Backend dependencies installed successfully', 'green');
            } catch (installError) {
                log('❌ Failed to install backend dependencies', 'red');
                process.exit(1);
            }
        }
    }
}

function checkEnvFile() {
    const envPath = path.join(__dirname, 'backend', '.env');
    const envExamplePath = path.join(__dirname, 'backend', '.env.example');
    
    if (!fs.existsSync(envPath)) {
        log('⚠️  .env file not found in backend directory', 'yellow');
        
        if (fs.existsSync(envExamplePath)) {
            log('Found .env.example file. Please copy it to .env and configure it.', 'yellow');
        } else {
            log('Please create a .env file in the backend directory with the following variables:', 'yellow');
            log('  - MONGODB_URI', 'blue');
            log('  - JWT_SECRET', 'blue');
            log('  - ADMIN_EMAIL', 'blue');
            log('  - ADMIN_PASSWORD', 'blue');
            log('  - CONTACT_EMAIL', 'blue');
            log('  - PORT (optional, defaults to 5000)', 'blue');
        }
        
        log('\n⚠️  The server will start but may fail without proper environment variables.', 'yellow');
    } else {
        log('✓ .env file found', 'green');
    }
}

function startServer() {
    const backendPath = path.join(__dirname, 'backend');
    const serverPath = path.join(backendPath, 'server.js');
    
    if (!fs.existsSync(serverPath)) {
        log('❌ server.js not found in backend directory', 'red');
        process.exit(1);
    }
    
    log('\n🚀 Starting D.Watson Pharmacy Server...', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('📍 Server will be available at: http://localhost:5000', 'green');
    log('📍 Admin Dashboard: http://localhost:5000/admin', 'green');
    log('📍 Login Page: http://localhost:5000/login', 'green');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('\nPress Ctrl+C to stop the server\n', 'yellow');
    
    // Start the server
    const server = spawn('node', ['server.js'], {
        cwd: backendPath,
        stdio: 'inherit',
        shell: true,
        env: process.env
    });
    
    // Handle server exit
    server.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
            log(`\n❌ Server exited with code ${code}`, 'red');
            process.exit(code);
        }
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        log('\n\n🛑 Shutting down server...', 'yellow');
        server.kill('SIGINT');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('\n\n🛑 Shutting down server...', 'yellow');
        server.kill('SIGTERM');
        process.exit(0);
    });
    
    server.on('error', (error) => {
        log(`❌ Failed to start server: ${error.message}`, 'red');
        process.exit(1);
    });
}

// Flag to prevent multiple installations
let dependenciesChecked = false;

// Main execution
function main() {
    // Prevent multiple runs
    if (dependenciesChecked) {
        log('⚠️  Script already running. Please wait...', 'yellow');
        return;
    }
    dependenciesChecked = true;
    
    log('\n╔════════════════════════════════════════════════╗', 'blue');
    log('║   D.Watson Pharmacy - Project Setup & Run      ║', 'blue');
    log('╚════════════════════════════════════════════════╝', 'blue');
    log('');
    
    // Check Node.js version
    checkNodeVersion();
    
    // Check and install backend dependencies
    checkBackendDependencies();
    
    // Check for .env file
    checkEnvFile();
    
    // Start the server
    startServer();
}

// Run the script
main();

