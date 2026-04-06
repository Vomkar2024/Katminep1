const express = require('express');
const parkingService = require('./parkingService');

const app = express();
app.use(express.json());

// --- Gate Control Endpoints ---

/**
 * Handle vehicle Entry.
 */
app.post('/gate/entry', async (req, res) => {
    const { tag, gateId } = req.body;
    if (!tag || !gateId) {
        return res.status(400).json({ error: "tag and gateId are required." });
    }

    try {
        const result = await parkingService.processEntry(tag, gateId);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
});

/**
 * Handle vehicle Exit.
 */
app.post('/gate/exit', async (req, res) => {
    const { tag, gateId } = req.body;
    if (!tag || !gateId) {
        return res.status(400).json({ error: "tag and gateId are required." });
    }

    try {
        const result = await parkingService.processExit(tag, gateId);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
});

// --- Capacity & Analytics Endpoints ---

/**
 * Get capacity status for all companies.
 */
app.get('/capacity', async (req, res) => {
    try {
        const data = await parkingService.getAllCompaniesCapacity();
        res.json({ status: "success", data });
    } catch (err) {
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * Get individual company capacity.
 */
app.get('/company/:id/capacity', async (req, res) => {
    try {
        const capacity = await parkingService.getCompanyCapacity(req.params.id);
        if (!capacity) return res.status(404).json({ error: "Company not found." });
        res.json(capacity);
    } catch (err) {
        res.status(500).json({ error: "Internal server error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Parking System Unified Server running on port ${PORT}`);
});
