const crypto = require('crypto');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

require('./vendor');

function hashFile(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function writeHashedAsset(sourcePath, destDir, baseName, ext) {
    const hash = hashFile(sourcePath);
    const hashedName = `${baseName}.${hash}.${ext}`;
    const destPath = path.join(destDir, hashedName);
    fs.copyFileSync(sourcePath, destPath);
    return hashedName;
}

async function build() {
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });
    fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });

    fs.copyFileSync(
        path.join(root, 'vendor/js-yaml.min.js'),
        path.join(dist, 'vendor/js-yaml.min.js')
    );
    fs.copyFileSync(path.join(root, 'regex-readme.html'), path.join(dist, 'regex-readme.html'));
    fs.copyFileSync(path.join(root, 'favicon.svg'), path.join(dist, 'favicon.svg'));
    fs.writeFileSync(path.join(dist, '.nojekyll'), '');

    const tmpDir = path.join(dist, '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    const tmpApp = path.join(tmpDir, 'app.js');
    const tmpAutoFix = path.join(tmpDir, 'auto-fix.js');
    const tmpCss = path.join(tmpDir, 'styles.css');

    await Promise.all([
        esbuild.build({
            entryPoints: [path.join(root, 'auto-fix.js')],
            outfile: tmpAutoFix,
            minify: true,
            legalComments: 'none',
            target: ['es2020']
        }),
        esbuild.build({
            entryPoints: [path.join(root, 'styles.css')],
            outfile: tmpCss,
            minify: true,
            bundle: true
        })
    ]);

    const autoFixHashed = writeHashedAsset(tmpAutoFix, dist, 'auto-fix', 'js');
    const cssHashed = writeHashedAsset(tmpCss, dist, 'styles', 'css');

    await esbuild.build({
        entryPoints: [path.join(root, 'app.js')],
        outfile: tmpApp,
        minify: true,
        legalComments: 'none',
        target: ['es2020'],
        define: {
            __AUTO_FIX_SCRIPT_URL__: JSON.stringify(autoFixHashed)
        }
    });

    const appHashed = writeHashedAsset(tmpApp, dist, 'app', 'js');

    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    html = html
        .replace(/href="styles\.css"/g, `href="${cssHashed}"`)
        .replace(/href="app\.js"/g, `href="${appHashed}"`)
        .replace(/src="app\.js"/g, `src="${appHashed}"`);

    fs.writeFileSync(path.join(dist, 'index.html'), html);
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log('Built production assets in dist/');
    console.log(`  ${cssHashed}`);
    console.log(`  ${appHashed}`);
    console.log(`  ${autoFixHashed}`);
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
