const fs = require('fs');
const path = require('path');

// Quick API analysis to identify the missing feature
const uploadApiPath = path.join(__dirname, 'backend/api/upload-apartment.js');
const expectedFeatures = [
    { name: 'Multer configuration', pattern: 'multer', weight: 3 },
    { name: 'File handling', pattern: 'file', weight: 2 },
    { name: 'Service integration', pattern: 'Service', weight: 2 },
    { name: 'Error handling', pattern: 'catch', weight: 1 },
    { name: 'Response formatting', pattern: 'res.json', weight: 1 }
];

const content = fs.readFileSync(uploadApiPath, 'utf8');
console.log('🔍 API FEATURE ANALYSIS\n');

expectedFeatures.forEach(feature => {
    const found = content.includes(feature.pattern);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${feature.name}: "${feature.pattern}" ${found ? 'FOUND' : 'MISSING'}`);
    
    if (!found) {
        console.log(`   Searching for variations...`);
        // Search for variations
        if (feature.pattern === 'catch') {
            console.log(`   - "try" found: ${content.includes('try')}`);
            console.log(`   - "catch" found: ${content.includes('catch')}`);
        }
        if (feature.pattern === 'res.json') {
            console.log(`   - "res.status" found: ${content.includes('res.status')}`);
            console.log(`   - "res.json" found: ${content.includes('res.json')}`);
        }
    }
});

console.log('\n📊 SUMMARY:');
const foundCount = expectedFeatures.filter(f => content.includes(f.pattern)).length;
console.log(`Found: ${foundCount}/${expectedFeatures.length}`);
console.log(`Coverage: ${Math.round((foundCount / expectedFeatures.length) * 100)}%`);
