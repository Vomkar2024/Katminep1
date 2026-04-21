const db = require('./db');

/**
 * Service to handle all parking-related database operations.
 */
class ParkingService {
    /**
     * Get real-time capacity for a specific company (Option A: Live Count).
     */
    async getCompanyCapacity(companyId) {
        const [companyResult] = await db.execute(
            'SELECT CompanyName, TotalSlots FROM Companies WHERE CompanyID = ?',
            [companyId]
        );

        if (companyResult.length === 0) return null;

        const { CompanyName, TotalSlots } = companyResult[0];

        const [liveCountRes] = await db.execute(`
            SELECT COUNT(*) AS activeVehicles 
            FROM ParkingLogs p 
            JOIN RFID_Tags r ON p.TagNumber = r.TagNumber 
            WHERE r.CompanyID = ? AND p.ExitTime IS NULL
        `, [companyId]);

        const activeVehicles = liveCountRes[0].activeVehicles;
        return {
            companyId: parseInt(companyId),
            companyName: CompanyName,
            totalCapacity: TotalSlots,
            currentlyParked: activeVehicles,
            freeSpaces: TotalSlots - activeVehicles
        };
    }

    /**
     * Get capacity status for all companies in one query.
     */
    async getAllCompaniesCapacity() {
        const query = `
            SELECT
                C.CompanyID,
                C.CompanyName,
                C.TotalSlots,
                COUNT(P.LogID) AS CurrentlyParked,
                CAST((C.TotalSlots - COUNT(P.LogID)) AS SIGNED) AS FreeSpaces
            FROM Companies C
            LEFT JOIN RFID_Tags R ON C.CompanyID = R.CompanyID
            LEFT JOIN ParkingLogs P ON R.TagNumber = P.TagNumber AND P.ExitTime IS NULL
            GROUP BY C.CompanyID, C.CompanyName, C.TotalSlots
        `;
        const [results] = await db.execute(query);
        return results;
    }

    /**
     * Create a new company with custom slot capacity.
     */
    async createCompany(companyId, companyName, totalSlots) {
        try {
            await db.execute(
                'INSERT INTO Companies (CompanyID, CompanyName, TotalSlots, OccupiedSlots) VALUES (?, ?, ?, 0)',
                [companyId, companyName, totalSlots]
            );
            return { companyId, companyName, totalSlots };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error('Company already exists.');
            }
            throw err;
        }
    }

    /**
     * Update company slot capacity.
     */
    async updateCompanyCapacity(companyId, totalSlots) {
        const [result] = await db.execute(
            'UPDATE Companies SET TotalSlots = ? WHERE CompanyID = ?',
            [totalSlots, companyId]
        );
        if (result.affectedRows === 0) throw new Error("Company not found.");
        return { companyId, totalSlots };
    }

    /**
     * Delete a company (only if no active vehicles).
     */
    async deleteCompany(companyId) {
        const [logs] = await db.execute(
            'SELECT COUNT(*) AS activeCount FROM ParkingLogs p JOIN RFID_Tags r ON p.TagNumber = r.TagNumber WHERE r.CompanyID = ? AND p.ExitTime IS NULL',
            [companyId]
        );
        if (logs[0].activeCount > 0) {
            throw new Error("Cannot delete company with active vehicles.");
        }
        const [result] = await db.execute('DELETE FROM Companies WHERE CompanyID = ?', [companyId]);
        if (result.affectedRows === 0) throw new Error("Company not found.");
        return { companyId };
    }

    /**
     * List all companies.
     */
    async getAllCompanies() {
        const [companies] = await db.execute('SELECT * FROM Companies ORDER BY CompanyID');
        return companies;
    }

    /**
     * Process vehicle entry.
     */
    async processEntry(tag, gateId) {
        const connection = await db.getConnection();
        try {
            // 1. Validate GateID
            const [gates] = await connection.execute(
                'SELECT * FROM Gates WHERE GateID = ? AND IsActive = TRUE',
                [gateId]
            );
            if (gates.length === 0) throw new Error("Invalid or inactive gate.");

            // 2. Validate Tag existence and stats
            const [tags] = await connection.execute(
                'SELECT * FROM RFID_Tags WHERE TagNumber = ?',
                [tag]
            );

            if (tags.length === 0) throw new Error("Tag does not exist.");
            const tagRecord = tags[0];

            if (!tagRecord.IsActive) throw new Error("Tag is not active.");
            if (tagRecord.IsParked) throw new Error("Vehicle is already checked-in.");
            if (!tagRecord.CompanyID) throw new Error("Tag is not assigned to a company.");

            // 3. Check Capacity
            const capacity = await this.getCompanyCapacity(tagRecord.CompanyID);
            if (!capacity) throw new Error("Assigned company not found.");
            if (capacity.freeSpaces <= 0) throw new Error("No free spaces available for this company.");

            // 4. Perform atomic entry updates
            await connection.beginTransaction();

            await connection.execute(
                'INSERT INTO ParkingLogs (TagNumber, GateID) VALUES (?, ?)',
                [tag, gateId]
            );

            await connection.execute(
                'UPDATE RFID_Tags SET IsParked = TRUE WHERE TagNumber = ?',
                [tag]
            );

            await connection.execute(
                'UPDATE Companies SET OccupiedSlots = OccupiedSlots + 1 WHERE CompanyID = ?',
                [tagRecord.CompanyID]
            );

            await connection.commit();
            return {
                status: "success",
                message: "Entry granted.",
                freeSpacesRemaining: capacity.freeSpaces - 1
            };

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Process vehicle exit.
     */
    async processExit(tag, gateId) {
        const connection = await db.getConnection();
        try {
            // 1. Validate GateID
            const [gates] = await connection.execute(
                'SELECT * FROM Gates WHERE GateID = ? AND IsActive = TRUE',
                [gateId]
            );
            if (gates.length === 0) throw new Error("Invalid or inactive gate.");

            // 2. Validate tag
            const [tags] = await connection.execute(
                'SELECT * FROM RFID_Tags WHERE TagNumber = ?',
                [tag]
            );

            if (tags.length === 0) throw new Error("Tag does not exist.");
            if (!tags[0].IsParked) throw new Error("Vehicle is not currently checked-in.");

            const tagRecord = tags[0];
            const companyId = tagRecord.CompanyID;

            // 3. Check if active log exists
            const [activeLogs] = await connection.execute(
                'SELECT LogID FROM ParkingLogs WHERE TagNumber = ? AND ExitTime IS NULL',
                [tag]
            );
            if (activeLogs.length === 0) throw new Error("No active parking log found.");

            // 4. Perform atomic exit updates
            await connection.beginTransaction();

            await connection.execute(
                'UPDATE ParkingLogs SET ExitTime = CURRENT_TIMESTAMP WHERE TagNumber = ? AND ExitTime IS NULL',
                [tag]
            );

            await connection.execute(
                'UPDATE RFID_Tags SET IsParked = FALSE WHERE TagNumber = ?',
                [tag]
            );

            await connection.execute(
                'UPDATE Companies SET OccupiedSlots = OccupiedSlots - 1 WHERE CompanyID = ? AND OccupiedSlots > 0',
                [companyId]
            );

            await connection.commit();
            return { status: "success", message: "Exit granted." };

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
}

module.exports = new ParkingService();
