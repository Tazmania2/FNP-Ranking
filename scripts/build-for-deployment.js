#!/usr/bin/env node

/**
 * Build Script for Deployment
 * 
 * This script handles the build process for deployment,
 * including TypeScript compilation with appropriate settings.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting deployment build process...\n');

try {
  // Step 1: Run verification checks
  console.log('1️⃣ Running deployment verification...');
  execSync('node scripts/verify-deployment.js', { stdio: 'inherit' });
  console.log('✅ Deployment verification passed\n');

  // Step 2: Type checking with relaxed settings for deployment
  console.log('2️⃣ Running type checking...');
  try {
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'inherit' });
    console.log('✅ Type checking passed\n');
  } catch (error) {
    console.log('⚠️  Type checking found issues, but continuing with build...\n');
  }

  // Step 3: Run linting
  console.log('3️⃣ Running linting...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ Linting passed\n');
  } catch (error) {
    console.log('⚠️  Linting found issues, but continuing with build...\n');
  }

  // Step 4: Build the application
  console.log('4️⃣ Building application...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');

  // Step 5: Verify build output
  console.log('5️⃣ Verifying build output...');
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(distPath)) {
    throw new Error('Build output directory not found');
  }
  
  if (!fs.existsSync(indexPath)) {
    throw new Error('index.html not found in build output');
  }
  
  const stats = fs.statSync(distPath);
  console.log(`✅ Build output verified (${distPath})\n`);

  console.log('🎉 Deployment build completed successfully!');
  console.log('\nBuild artifacts are ready in the dist/ directory');
  console.log('You can now deploy to Vercel or test locally with: npm run preview');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}