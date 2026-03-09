const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, '..', 'app'),
    path.join(__dirname, '..', 'components')
];

const replacements = [
    // Text Contrast Boosts (Medium Opacity)
    { from: /text-base-content\/50\b/g, to: 'text-base-content/70' },
    { from: /text-base-content\/60\b/g, to: 'text-base-content/80' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const originalContent = content;

            for (const { from, to } of replacements) {
                content = content.replace(from, to);
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated opacities: ${fullPath.replace(path.join(__dirname, '..') + path.sep, '')}`);
            }
        }
    }
}

console.log('Starting secondary text readability upgrades...');
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        processDirectory(dir);
    } else {
        console.log(`Directory not found: ${dir}`);
    }
});
console.log('Secondary text readability upgrades completed.');
