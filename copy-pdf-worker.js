/**
 * Script to copy the PDF.js worker file from node_modules to the public directory
 * This ensures the worker file is available locally and prevents 404 errors
 */

import fs from 'fs';
import path from 'path';

// Define paths
const sourceWorkerPath = path.resolve('./node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetWorkerPath = path.resolve('./public/pdf.worker.min.js');

// Create public directory if it doesn't exist
if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
  console.log('Created public directory');
}

// Copy the worker file
try {
  if (fs.existsSync(sourceWorkerPath)) {
    fs.copyFileSync(sourceWorkerPath, targetWorkerPath);
    console.log('Successfully copied PDF.js worker file to public directory');
  } else {
    console.error('PDF.js worker file not found in node_modules. Please check your installation.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error copying PDF.js worker file:', error);
  process.exit(1);
}