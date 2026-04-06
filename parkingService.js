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
     * Process vehicle entry.
     */
    async processEntry(tag, gateId) {
        const connection = await db.getConnection();
        try {
            // 1. Validate Tag existence and stats
            const [tags] = await connection.execute(
                'SELECT * FROM RFID_Tags WHERE TagNumber = ?',
                [tag]
            );

            if (tags.length === 0) throw new Error("Tag does not exist.");
            const tagRecord = tags[0];

            if (!tagRecord.IsActive) throw new Error("Tag is not active.");
            if (tagRecord.IsParked) throw new Error("Vehicle is already checked-in.");
            if (!tagRecord.CompanyID) throw new Error("Tag is not assigned to a company.");

            // 2. Check Capacity
            const capacity = await this.getCompanyCapacity(tagRecord.CompanyID);
            if (!capacity) throw new Error("Assigned company not found.");
            if (capacity.freeSpaces <= 0) throw new Error("No free spaces available for this company.");

            // 3. Perform atomic entry updates
            await connection.beginTransaction();

            await connection.execute(
                'INSERT INTO ParkingLogs (TagNumber, GateID) VALUES (?, ?)',
                [tag, gateId]
            );

            await connection.execute(
                'UPDATE RFID_Tags SET IsParked = TRUE WHERE TagNumber = ?',
                [tag]
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
            const [tags] = await connection.execute(
                'SELECT * FROM RFID_Tags WHERE TagNumber = ?',
                [tag]
            );

            if (tags.length === 0) throw new Error("Tag does not exist.");
            if (!tags[0].IsParked) throw new Error("Vehicle is not currently checked-in.");

            await connection.beginTransaction();

            // Set exit time for the currently active log
            await connection.execute(
                'UPDATE ParkingLogs SET ExitTime = CURRENT_TIMESTAMP WHERE TagNumber = ? AND ExitTime IS NULL',
                [tag]
            );

            // Update tag status
            await connection.execute(
                'UPDATE RFID_Tags SET IsParked = FALSE WHERE TagNumber = ?',
                [tag]
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
