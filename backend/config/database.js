import { createPool } from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    // Removed invalid options: acquireTimeout, timeout, reconnect
    // Valid MySQL2 pool options:
    connectionLimit: 10,
    //queueLimit: 0,
    //acquireTimeout: 60000,
    //timeout: 60000
};

// Create connection pool for better performance
const pool = createPool(dbConfig);

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }
    console.log('Connected to MySQL database as id', connection.threadId);
    connection.release();
});

export default pool.promise();