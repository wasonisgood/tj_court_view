const fs = require('fs');
const DATA_FILE = './data.js';

function readDB() {
    try {
        let content = fs.readFileSync(DATA_FILE, 'utf-8');
        let jsonStr = content.replace(/^window\.JUDGMENT_DB\s*=\s*/, '').replace(/;\s*$/, '');
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Error reading DB:", e);
        process.exit(1);
    }
}

const db = readDB();
const categories = new Set();
db.forEach(item => {
    if (item.analysis_meta && item.analysis_meta.category_normalized) {
        categories.add(item.analysis_meta.category_normalized);
    }
});

console.log(JSON.stringify([...categories], null, 2));
