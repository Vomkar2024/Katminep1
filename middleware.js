/**
 * Simple API Key Authentication Middleware
 */

const API_KEY = process.env.PARKING_API_KEY || 'parking-secret-key-2026';

function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const apiKey = req.headers['x-api-key'];

    // Check for API key in header or Authorization Bearer
    if (apiKey === API_KEY || authHeader === `Bearer ${API_KEY}`) {
        return next();
    }

    // Allow public access for capacity endpoints (optional - for dashboard displays)
    if (req.path === '/capacity' || req.path.startsWith('/company/') && req.path.endsWith('/capacity')) {
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
}

module.exports = { authenticate };
