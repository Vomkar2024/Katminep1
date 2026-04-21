/**
 * Simple API Key Authentication Middleware
 */

const config = require('./config');
const API_KEY = config.apiKey;

// Public endpoints (no auth required)
const PUBLIC_PATHS = [
    '/capacity',
];

function isPublicPath(path) {
    // Check exact match
    if (PUBLIC_PATHS.includes(path)) return true;
    // Check /company/:id/capacity pattern
    if (/^\/company\/[^/]+\/capacity$/.test(path)) return true;
    return false;
}

function authenticate(req, res, next) {
    // Skip auth for public endpoints
    if (isPublicPath(req.path)) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    // Check for API key in header or Authorization Bearer
    if (apiKey === API_KEY || authHeader === `Bearer ${API_KEY}`) {
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
}

module.exports = { authenticate };
