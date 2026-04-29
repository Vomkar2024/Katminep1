/**
 * Simple API Key Authentication Middleware
 */

const config = require('./config');
const API_KEY = config.apiKey || 'parking-secret-key-2026';

// Public endpoints (no auth required)
const PUBLIC_PATHS = [
    '/capacity',
    '/tags',
    '/companies',
];

function isPublicPath(path) {
    return PUBLIC_PATHS.includes(path) || /^\/company\/[^/]+\/capacity$/.test(path);
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
