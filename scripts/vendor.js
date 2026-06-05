const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(root, 'node_modules/js-yaml/dist/js-yaml.min.js');
const vendorDir = path.join(root, 'vendor');

if (!fs.existsSync(source)) {
    console.error('js-yaml not found. Run npm install first.');
    process.exit(1);
}

fs.mkdirSync(vendorDir, { recursive: true });
fs.copyFileSync(source, path.join(vendorDir, 'js-yaml.min.js'));
