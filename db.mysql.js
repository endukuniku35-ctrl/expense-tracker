/**
 * db.mysql.js – Optional MySQL Database Connection
 * 
 * To use MySQL instead of JSON file storage:
 * 1. npm install mysql2
 * 2. Update the config below
 * 3. Run the schema below in your MySQL database
 * 4. Replace file I/O in routes with the queries below
 */

const mysql = require('mysql2/promise');

// ─── Configuration ──────────────────────────────────
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'curry_expense_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('MySQL pool created');
  }
  return pool;
}

// ─── MySQL Schema ────────────────────────────────────
/*
CREATE DATABASE IF NOT EXISTS curry_expense_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE curry_expense_tracker;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  userid VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(50),
  role ENUM('admin','member') DEFAULT 'member',
  email VARCHAR(100),
  avatar VARCHAR(10),
  join_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  paid_by VARCHAR(20) NOT NULL,
  paid_by_name VARCHAR(100),
  category VARCHAR(50) DEFAULT 'General',
  expense_date DATE NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  member_id VARCHAR(20) NOT NULL,
  member_name VARCHAR(100),
  amount DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM('paid','partial','pending') DEFAULT 'pending',
  last_payment_date DATE,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  for_role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// ─── Query Helpers ───────────────────────────────────
async function query(sql, params = []) {
  const db = await getPool();
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { query, queryOne, getPool };
