const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

require('./vendor');

fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });

fs.copyFileSync(
    path.join(root, 'vendor/js-yaml.min.js'),
    path.join(dist, 'vendor/js-yaml.min.js')
);
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
fs.copyFileSync(path.join(root, 'regex-readme.html'), path.join(dist, 'regex-readme.html'));

esbuild.buildSync({
    entryPoints: [path.join(root, 'app.js')],
    outfile: path.join(dist, 'app.js'),
    minify: true,
    legalComments: 'none',
    target: ['es2020']
});

esbuild.buildSync({
    entryPoints: [path.join(root, 'styles.css')],
    outfile: path.join(dist, 'styles.css'),
    minify: true,
    bundle: true
});

console.log('Built production assets in dist/');
