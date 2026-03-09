const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, '..', 'app'),
    path.join(__dirname, '..', 'components')
];

const replacements = [
    // Text Sizes
    { from: /text-\[8px\]/g, to: 'text-[10px]' },
    { from: /text-\[9px\]/g, to: 'text-xs' },
    { from: /text-\[10px\]/g, to: 'text-sm' },
    { from: /text-\[11px\]/g, to: 'text-sm' },

    // Text Contrast Fixes
    { from: /text-base-content\/40\b/g, to: 'text-base-content/70' },
    { from: /text-base-content\/20\b/g, to: 'text-base-content/50' },
    { from: /text-base-content\/10\b/g, to: 'text-base-content/40' },

    // Border Contrast Fixes
    { from: /border-base-content\/5\b/g, to: 'border-base-content/20' }
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
                console.log(`Updated: ${fullPath.replace(path.join(__dirname, '..') + path.sep, '')}`);
            }
        }
    }
}

console.log('Starting readability upgrades...');
targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        processDirectory(dir);
    } else {
        console.log(`Directory not found: ${dir}`);
    }
});
console.log('Readability upgrades completed.');
