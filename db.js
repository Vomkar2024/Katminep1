const mysql = require('mysql2/promise');

// Standard pool configuration
const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '1234',
    database: 'ParkingSystem',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ Database connected successfully');
        connection.release();
    } catch (err) {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);
    }
}

testConnection();

module.exports = pool;
