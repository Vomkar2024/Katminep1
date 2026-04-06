const db = require('./db');

/**
 * Script to generate random RFID tags and assign them to companies.
 */
async function manageRFIDTags() {
    try {
        // --- PART 1: GENERATE & INSERT ---
        const count = 150;
        const uniqueCodes = new Set();
        while (uniqueCodes.size < count) {
            const code = Math.floor(10000000 + Math.random() * 90000000);
            uniqueCodes.add(code);
        }

        const values = Array.from(uniqueCodes).map(code => {
            const companyId = Math.floor(Math.random() * 5) + 1; // Random company 1-5
            return [code, companyId];
        });

        console.log("Inserting tags...");
        const insertSql = "INSERT IGNORE INTO RFID_Tags (TagNumber, CompanyID) VALUES ?";
        await db.query(insertSql, [values]);

        // --- PART 2: SELECT & DISPLAY ---
        console.log("\n--- Current RFID Tags in Database ---");
        const [rows] = await db.execute(
            "SELECT TagNumber, CompanyID, IsActive, CreatedAt FROM RFID_Tags LIMIT 20"
        );

        console.table(rows);
        console.log(`... and ${count - 20} more tags.`);

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        // Note: We don't close the pool here because it's a shared pool
        // But for a CLI script, we should probably end it or it will hang
        await db.end();
        console.log("\nMySQL connection is closed.");
    }
}

manageRFIDTags();