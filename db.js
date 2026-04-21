const mysql = require('mysql2/promise');
const config = require('./config');

// Standard pool configuration
const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Track initialization state
let initialized = false;
let initError = null;

// Test connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Database connected successfully');
        connection.release();
        initialized = true;
    } catch (err) {
        console.error('✗ Database connection failed:', err.message);
        initError = err;
        // Don't exit - allow app to start for health checks
    }
}

testConnection();

// Health check method
async function isHealthy() {
    if (!initialized || initError) return false;
    try {
        const conn = await pool.getConnection();
        conn.release();
        return true;
    } catch {
        return false;
    }
}

module.exports = pool;
module.exports.isHealthy = isHealthy;
