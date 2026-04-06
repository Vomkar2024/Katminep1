const mysql = require('mysql2/promise');

async function manageRFIDTags() {
    let connection;
    try {
        // 1. Establish connection
        connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '1234',
            database: 'ParkingSystem'
        });

        // --- PART 1: GENERATE & INSERT ---
        const count = 150;
        const uniqueCodes = new Set();
        while (uniqueCodes.size < count) {
            const code = Math.floor(10000000 + Math.random() * 90000000);
            uniqueCodes.add(code);
        }

        const values = Array.from(uniqueCodes).map(code => [code]);

        console.log("Inserting tags...");
        const insertSql = "INSERT IGNORE INTO RFID_Tags (TagNumber) VALUES ?";
        // Note: I added IGNORE so it won't crash if you run it twice
        await connection.query(insertSql, [values]);

        // --- PART 2: SELECT & DISPLAY ---
        console.log("\n--- Current RFID Tags in Database ---");

        // Fetching the top 20 just to keep the terminal clean
        const [rows] = await connection.execute(
            "SELECT TagNumber, IsActive, CreatedAt FROM RFID_Tags LIMIT 20"
        );

        // This built-in function creates a neat UI table in your console
        console.table(rows);

        console.log(`... and ${count - 20} more tags.`);

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        if (connection) {
            await connection.end();
            console.log("\nMySQL connection is closed.");
        }
    }
}

manageRFIDTags();