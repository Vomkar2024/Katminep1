const crypto = require('crypto');

// 1. Configuration: Company Slots
const companyConfigs = [
    { id: 1, name: "Company A", totalSlots: 10 },
    { id: 2, name: "Company B", totalSlots: 30 },
];

// 2. Database Simulation
let tagsTable = [];
let companyStatus = [];

/**
 * Generates a unique 8-digit numeric tag
 */
function generateUniqueTag(existingTags) {
    let tag;
    do {
        tag = Math.floor(10000000 + Math.random() * 90000000).toString();
    } while (existingTags.has(tag));
    return tag;
}

/**
 * Initialize the Database
 */
function initializeSystem() {
    const usedTags = new Set();

    companyConfigs.forEach(config => {
        // Initialize real-time counter
        companyStatus.push({
            ...config,
            occupied: 0
        });

        // Generate tags for each slot allocated to the company
        for (let i = 0; i < config.totalSlots; i++) {
            const newTag = generateUniqueTag(usedTags);
            usedTags.add(newTag);

            tagsTable.push({
                tagId: newTag,
                companyId: config.id,
                isInside: false // Track if vehicle is currently in the lot
            });
        }
    });

    console.log(`System Initialized. Total Tags Generated: ${tagsTable.length}`);
}

/**
 * RFID Scanner Logic (Entrance/Exit)
 */
function handleRFIDScan(scannedTag) {
    const record = tagsTable.find(t => t.tagId === scannedTag);

    if (!record) {
        return console.log(`[ALERT] Unauthorized Tag: ${scannedTag}`);
    }

    const company = companyStatus.find(c => c.id === record.companyId);

    if (!record.isInside) {
        // ENTRANCE LOGIC
        if (company.occupied < company.totalSlots) {
            record.isInside = true;
            company.occupied++;
            console.log(`\n--- ENTRANCE ---`);
            console.log(`Tag: ${scannedTag} | Company: ${company.name}`);
        } else {
            console.log(`[DENIED] ${company.name} parking is full!`);
        }
    } else {
        // EXIT LOGIC
        record.isInside = false;
        company.occupied--;
        console.log(`\n--- EXIT ---`);
        console.log(`Tag: ${scannedTag} | Company: ${company.name} space vacated.`);
    }

    displayDashboard();
}

/**
 * UI/Screen Update Simulation
 */
function displayDashboard() {
    console.table(companyStatus.map(c => ({
        "Company": c.name,
        "Total": c.totalSlots,
        "Occupied": c.occupied,
        "Free": c.totalSlots - c.occupied
    })));
}

// --- RUNNING THE SYSTEM ---

initializeSystem();
displayDashboard();

// Example Simulation: Scanning a tag from Company A (Index 0)
const sampleTag = tagsTable[0].tagId;
handleRFIDScan(sampleTag); // Enter
handleRFIDScan(sampleTag); // Exit