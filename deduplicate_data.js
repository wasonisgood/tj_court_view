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

function saveDB(db) {
    const content = `window.JUDGMENT_DB = ${JSON.stringify(db, null, 2)};`;
    fs.writeFileSync(DATA_FILE, content, 'utf-8');
}

function deduplicate() {
    console.log("Loading DB for deduplication...");
    const db = readDB();
    const initialCount = db.length;
    
    const seenIds = new Set();
    const uniqueDb = [];
    
    for (const item of db) {
        const id = item.meta.id;
        if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueDb.push(item);
        }
    }
    
    const finalCount = uniqueDb.length;
    console.log(`Initial count: ${initialCount}`);
    console.log(`Unique count: ${finalCount}`);
    console.log(`Removed ${initialCount - finalCount} duplicates.`);
    
    if (initialCount !== finalCount) {
        console.log("Saving unique items...");
        saveDB(uniqueDb);
        console.log("Done.");
    } else {
        console.log("No duplicates found.");
    }
}

deduplicate();
