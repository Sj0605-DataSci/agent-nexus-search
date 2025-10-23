/**
 * Entry point that loads the correct main process file based on environment
 */

const path = require('path');
const fs = require('fs');

// Development path
const devMain = path.join(__dirname, '.erb/dll/main.bundle.dev.js');
// Production path
const prodMain = path.join(__dirname, 'release/app/dist/main/main.js');

// Check which file exists and load it
if (fs.existsSync(devMain)) {
  require(devMain);
} else if (fs.existsSync(prodMain)) {
  require(prodMain);
} else {
  throw new Error(
    'Could not find main process bundle. Please run "npm run build:main" or "npm run prestart"'
  );
}
