const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Create a connection pool
const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'ParkingSystem',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.post('/gate/entry', async (req, res) => {
    const { tag, gateId } = req.body;

    if (!tag || !gateId) {
        return res.status(400).json({ error: "tag and gateId are required." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        
        // 1. Check Existence
        const [tags] = await connection.execute(
            'SELECT * FROM RFID_Tags WHERE TagNumber = ?',
             [tag]
        );

        if (tags.length === 0) {
            return res.status(404).json({ status: "error", message: "Tag does not exist." });
        }

        const tagRecord = tags[0];

        // 2. Check Status
        if (!tagRecord.IsActive) {
            return res.status(403).json({ status: "error", message: "Tag is not active." });
        }

        if (tagRecord.IsParked) {
            return res.status(409).json({ status: "error", message: "Vehicle is already checked-in." });
        }

        if (!tagRecord.CompanyID) {
            return res.status(400).json({ status: "error", message: "Tag is not assigned to a company." });
        }

        // 3. Check Capacity
        const [companies] = await connection.execute(
            'SELECT TotalSlots, OccupiedSlots FROM Companies WHERE CompanyID = ?', 
            [tagRecord.CompanyID]
        );

        if (companies.length === 0) {
            return res.status(404).json({ status: "error", message: "Assigned company not found." });
        }

        const company = companies[0];
        const freeSpaces = company.TotalSlots - company.OccupiedSlots;

        if (freeSpaces <= 0) {
            return res.status(409).json({ status: "error", message: "No free spaces available for this company." });
        }

        // 4. Log the Event & Update statuses
        // We use a transaction because we're modifying multiple tables and need consistency
        await connection.beginTransaction();

        // Log the entry
        await connection.execute(
            'INSERT INTO ParkingLogs (TagNumber, GateID) VALUES (?, ?)',
            [tag, gateId]
        );

        // Mark the vehicle as parked
        await connection.execute(
            'UPDATE RFID_Tags SET IsParked = TRUE WHERE TagNumber = ?',
            [tag]
        );

        // Update occupied slots
        await connection.execute(
            'UPDATE Companies SET OccupiedSlots = OccupiedSlots + 1 WHERE CompanyID = ?',
            [tagRecord.CompanyID]
        );

        await connection.commit();

        res.status(200).json({ 
            status: "success", 
            message: "Entry granted.",
            freeSpacesRemaining: freeSpaces - 1
        });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error("Rollback failed:", rollbackErr);
            }
        }
        console.error("Database error:", err);
        res.status(500).json({ status: "error", message: "Internal server error." });
    } finally {
        if (connection) connection.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Gate validation server is running on port ${PORT}`);
});
