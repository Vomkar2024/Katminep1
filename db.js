const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    acquireTimeout: 60000,
    connectTimeout: 10000,
    timeout: 60000
});

let initialized = false;
let initError = null;

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        initialized = true;
        console.log('Database connected successfully.');
    } catch (err) {
        initError = err;
        console.error('Database connection failed:', err.message);
    }
}

testConnection();

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
    initialized = false;
});

async function execute(query, params) {
    return pool.execute(query, params);
}

async function getConnection() {
    return pool.getConnection();
}

async function isHealthy() {
    if (initError) return false;
    try {
        const [rows] = await pool.execute('SELECT 1 AS healthy');
        return rows[0].healthy === 1;
    } catch (err) {
        return false;
    }
}

async function end() {
    await pool.end();
}

module.exports = {
    execute,
    getConnection,
    isHealthy,
    end
};
