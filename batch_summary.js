
const fs = require('fs');
const https = require('https');

// --- CONFIG ---
const API_KEY = "AIzaSyCZaSb7T-jBnVKrlhvSiGpTks_HI4gLtI0";
const DATA_FILE = './data.js';
const RPM_DELAY = 5000; // 5 seconds (safety margin for 15 RPM)
const TARGET_KEYWORDS = ['撤銷', '廢棄'];

// --- UTILS ---

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function readDB() {
    try {
        let content = fs.readFileSync(DATA_FILE, 'utf-8');
        // Strip JS wrapper
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
    // console.log("  -> Saved to disk.");
}

function postGemini(prompt) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        if (parsed.error) reject(new Error(parsed.error.message));
                        else resolve(parsed);
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

// --- MAIN ---

async function main() {
    console.log("Starting batch summary generation...");
    console.log(`Target: Cases with Main Text containing ${TARGET_KEYWORDS.join(', ')}`);
    console.log(`Delay: ${RPM_DELAY}ms per request`);

    // 1. Load initial DB
    let db = readDB();
    
    // 2. Identify targets
    let targets = [];
    db.forEach((item, index) => {
        const mainText = item.main_text_clean || "";
        const isTarget = TARGET_KEYWORDS.some(k => mainText.includes(k));
        const hasSummary = !!item.ai_summary;
        
        if (isTarget && !hasSummary) {
            targets.push(index);
        }
    });

    if (targets.length === 0) {
        console.log("No new cases needing summary.");
        return;
    }

    console.log(`Found ${targets.length} new cases needing summary.`);

    // 3. Process loop
    for (let i = 0; i < targets.length; i++) {
        const dbIndex = targets[i];
        const item = db[dbIndex];
        
        console.log(`[${i+1}/${targets.length}] Processing: ${item.meta.title}...`);

        // Find "Reasoning" section
        let reasoningText = "";
        if (item.sections) {
            // Find key containing "理由"
            const key = Object.keys(item.sections).find(k => k.includes('理由'));
            if (key) reasoningText = item.sections[key];
        }

        if (!reasoningText) {
            console.log("  -> No reasoning section found. Skipping.");
            continue;
        }

        // Prepare prompt
        const paragraphs = reasoningText.split('\n').filter(p => p.trim());
        if (paragraphs.length === 0) {
             console.log("  -> Empty reasoning. Skipping.");
             continue;
        }

        const numberedText = paragraphs.map((p, idx) => `[${idx}] ${p}`).join('\n');

        const prompt = `你是一個專業的法律助理。請根據以下法院判決的「理由」部分，生成一份重點摘要。
請遵循以下規則：
1. 用列點方式說明判決的關鍵爭點、法院的判斷理由、以及最終結論。
2. 對於每一個摘要點，**必須**具體引用支持該論點的段落編號，格式為 [ref:段落編號]。
3. 回傳格式必須為單純的 JSON 陣列，不要有 markdown 標記。格式範例：
[
    { "point": "原告主張...", "refs": [0, 2] },
    { "point": "法院認為...", "refs": [5] }
]

判決文本如下：
${numberedText}`;

        let success = false;
        let retryCount = 0;
        const maxRetries = 5;

        while (!success && retryCount < maxRetries) {
            try {
                const response = await postGemini(prompt);
                
                // Extract text
                if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    let rawText = response.candidates[0].content.parts[0].text;
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    try {
                        const summaryJson = JSON.parse(rawText);
                        db[dbIndex].ai_summary = summaryJson;
                        saveDB(db);
                        console.log("  -> Success & Saved.");
                        success = true;
                    } catch (jsonErr) {
                        console.error("  -> JSON Parse Error:", jsonErr.message);
                        console.error("  -> Raw:", rawText);
                        break; // Don't retry JSON errors
                    }
                } else {
                    console.error("  -> API Error: No candidates.");
                    break;
                }

            } catch (apiErr) {
                if (apiErr.message.includes('429')) {
                    console.log("  -> Raw API Error:", apiErr.message); // Added for verification
                    retryCount++;
                    // Try to extract "Please retry in 38.402350949s."
                    const match = apiErr.message.match(/Please retry in ([\d.]+)s/);
                    let waitTime = 10000; // Default 10s
                    if (match && match[1]) {
                        waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
                    }
                    console.log(`  -> Hit rate limit. Waiting ${Math.round(waitTime/1000)}s before retry ${retryCount}...`);
                    await sleep(waitTime);
                } else {
                    console.error("  -> API Request Failed:", apiErr.message);
                    break;
                }
            }
        }

        // Base rate limit wait
        if (i < targets.length - 1) {
            await sleep(RPM_DELAY);
        }
    }
    
    console.log("Batch processing complete.");
}

main();
