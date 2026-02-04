const fs = require('fs');

const INDEX_FILE = './index.html';
let content = fs.readFileSync(INDEX_FILE, 'utf-8');

// 1. Extract GeminiSummary and API Key
const geminiBlockStart = `        // --- API Configuration ---`;
const geminiBlockEndMarker = `        const ParagraphReader = ({ text, highlightTerm, sectionTitle, savedSummary }) => {`;

const startIdx = content.indexOf(geminiBlockStart);
const endIdx = content.indexOf(geminiBlockEndMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find Gemini block");
    process.exit(1);
}

const geminiBlock = content.substring(startIdx, endIdx);

// 2. Remove Gemini block from original location
const contentWithoutGemini = content.substring(0, startIdx) + content.substring(endIdx);

// 3. Insert Gemini block before KeyCasesSection
const keyCasesStartMarker = `        // --- Key Cases Component ---`;
const insertIdx = contentWithoutGemini.indexOf(keyCasesStartMarker);

if (insertIdx === -1) {
    console.error("Could not find KeyCases block");
    process.exit(1);
}

const newContent = contentWithoutGemini.substring(0, insertIdx) + geminiBlock + '
' + contentWithoutGemini.substring(insertIdx);

fs.writeFileSync(INDEX_FILE, newContent, 'utf-8');
console.log("Successfully reorganized index.html");
