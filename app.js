const express = require('express');
const parkingService = require('./parkingService');
const { authenticate } = require('./middleware');
const db = require('./db');
const config = require('./config');

const app = express();
app.use(express.json());

// Enable CORS for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'index.html'));
});

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
    if (typeof tag !== 'number' || !Number.isInteger(tag)) {
        return res.status(400).json({ error: "tag must be an integer." });
    }

    try {
        const result = await parkingService.processEntry(tag, gateId);
        res.status(200).json(result);
    } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('not active') || err.message.includes('already checked-in') || err.message.includes('not assigned') || err.message.includes('No free spaces')) {
            res.status(400).json({ status: "error", message: err.message });
        } else {
            res.status(500).json({ status: "error", message: "Internal server error." });
        }
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
    if (typeof tag !== 'number' || !Number.isInteger(tag)) {
        return res.status(400).json({ error: "tag must be an integer." });
    }

    try {
        const result = await parkingService.processExit(tag, gateId);
        res.status(200).json(result);
    } catch (err) {
        if (err.message.includes('does not exist') || err.message.includes('not currently checked-in')) {
            res.status(400).json({ status: "error", message: err.message });
        } else {
            res.status(500).json({ status: "error", message: "Internal server error." });
        }
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
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
        return res.status(400).json({ error: "companyId must be an integer." });
    }
    try {
        const capacity = await parkingService.getCompanyCapacity(companyId);
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
    if (!Number.isInteger(companyId) || companyId < 1) {
        return res.status(400).json({ error: "companyId must be a positive integer." });
    }
    if (typeof companyName !== 'string' || companyName.trim().length === 0) {
        return res.status(400).json({ error: "companyName must be a non-empty string." });
    }
    if (totalSlots < 1 || totalSlots > 1000) {
        return res.status(400).json({ error: "totalSlots must be between 1 and 1000." });
    }
    try {
        const result = await parkingService.createCompany(companyId, companyName, totalSlots);
        res.status(201).json({ status: "success", data: result });
    } catch (err) {
        if (err.message.includes('duplicate') || err.message.includes('Duplicate')) {
            res.status(409).json({ error: "Company already exists." });
        } else {
            res.status(500).json({ error: "Internal server error." });
        }
    }
});

/**
 * Update company slot capacity.
 */
app.put('/companies/:id', async (req, res) => {
    const companyId = parseInt(req.params.id, 10);
    const { totalSlots } = req.body;
    if (isNaN(companyId)) {
        return res.status(400).json({ error: "companyId must be an integer." });
    }
    if (!totalSlots) {
        return res.status(400).json({ error: "totalSlots is required." });
    }
    if (totalSlots < 1 || totalSlots > 1000) {
        return res.status(400).json({ error: "totalSlots must be between 1 and 1000." });
    }
    try {
        const result = await parkingService.updateCompanyCapacity(companyId, totalSlots);
        res.json({ status: "success", data: result });
    } catch (err) {
        if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: "Internal server error." });
        }
    }
});

/**
 * Delete a company (only if no vehicles currently parked).
 */
app.delete('/companies/:id', async (req, res) => {
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
        return res.status(400).json({ error: "companyId must be an integer." });
    }
    try {
        const result = await parkingService.deleteCompany(companyId);
        res.json({ status: "success", data: result });
    } catch (err) {
        if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
        } else if (err.message.includes('active vehicles')) {
            res.status(409).json({ error: err.message });
        } else {
            res.status(500).json({ error: "Internal server error." });
        }
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

/**
 * List all tags.
 */
app.get('/tags', async (req, res) => {
    try {
        const tags = await parkingService.getAllTags();
        res.json({ status: "success", data: tags });
    } catch (err) {
        res.status(500).json({ error: "Internal server error." });
    }
});

// --- Health Check Endpoint ---

/**
 * Health check for monitoring.
 */
app.get('/health', async (req, res) => {
    const db = require('./db');
    const dbHealthy = await db.isHealthy();
    if (dbHealthy) {
        res.json({ status: "healthy", database: "connected" });
    } else {
        res.status(503).json({ status: "unhealthy", database: "disconnected" });
    }
});

const server = app.listen(config.port, () => {
    console.log(`Parking System Unified Server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await db.end();
        console.log('Database pool closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(async () => {
        await db.end();
        console.log('Database pool closed.');
        process.exit(0);
    });
});
