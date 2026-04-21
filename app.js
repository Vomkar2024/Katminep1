const express = require('express');
const parkingService = require('./parkingService');
const { authenticate } = require('./middleware');

const app = express();
app.use(express.json());

// Apply authentication to all routes except capacity endpoints
app.use(authenticate);

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

// --- Company Management Endpoints ---

/**
 * Create a new company with custom slot capacity.
 */
app.post('/companies', async (req, res) => {
    const { companyId, companyName, totalSlots } = req.body;
    if (!companyId || !companyName || !totalSlots) {
        return res.status(400).json({ error: "companyId, companyName, and totalSlots are required." });
    }
    if (totalSlots < 1 || totalSlots > 1000) {
        return res.status(400).json({ error: "totalSlots must be between 1 and 1000." });
    }
    try {
        const result = await parkingService.createCompany(companyId, companyName, totalSlots);
        res.status(201).json({ status: "success", data: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Update company slot capacity.
 */
app.put('/companies/:id', async (req, res) => {
    const { totalSlots } = req.body;
    if (!totalSlots) {
        return res.status(400).json({ error: "totalSlots is required." });
    }
    if (totalSlots < 1 || totalSlots > 1000) {
        return res.status(400).json({ error: "totalSlots must be between 1 and 1000." });
    }
    try {
        const result = await parkingService.updateCompanyCapacity(req.params.id, totalSlots);
        res.json({ status: "success", data: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Delete a company (only if no vehicles currently parked).
 */
app.delete('/companies/:id', async (req, res) => {
    try {
        const result = await parkingService.deleteCompany(req.params.id);
        res.json({ status: "success", data: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * List all companies.
 */
app.get('/companies', async (req, res) => {
    try {
        const companies = await parkingService.getAllCompanies();
        res.json({ status: "success", data: companies });
    } catch (err) {
        res.status(500).json({ error: "Internal server error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Parking System Unified Server running on port ${PORT}`);
});
