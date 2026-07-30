import mysql from 'mysql2/promise';
import 'dotenv/config';

// Create a MySQL connection pool
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

// Verify the database connection
export const testDb = async () => {
  // Get a connection from the pool
  const connection = await pool.getConnection();

  // Check whether the database is reachable
  await connection.ping();

  // Return the connection to the pool
  connection.release();

  console.log('MySQL connected');
};