/**
 * PRODUCTION NODE.JS SERVER FOR RENDER + AIVEN
 */

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// ======================
// DATABASE CONNECTION
// ======================
let db = null;

if (process.env.AIVEN_URL) {
  try {
    const pool = mysql.createPool(process.env.AIVEN_URL);
    db = pool.promise();
    console.log("✅ Connected to Aiven MySQL");
  } catch (err) {
    console.error("❌ DB Connection Failed:", err.message);
  }
} else {
  console.warn("⚠️ AIVEN_URL NOT SET");
}

// ======================
// SAFE QUERY WRAPPER
// ======================
const query = async (sql, params = []) => {
  if (!db) throw new Error("Database not connected");
  return db.query(sql, params);
};

// ======================
// INIT DATABASE
// ======================
const initDb = async () => {
  try {
    if (!db) return;

    await query(`
      CREATE TABLE IF NOT EXISTS site_configs (
        id INT PRIMARY KEY,
        config_json LONGTEXT
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        role VARCHAR(50),
        registered_at VARCHAR(100)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255),
        phone VARCHAR(50),
        total DECIMAL(10,2),
        status VARCHAR(50),
        type VARCHAR(20),
        created_at VARCHAR(100)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        guests INT,
        date VARCHAR(50),
        time VARCHAR(50),
        status VARCHAR(50),
        created_at VARCHAR(100)
      )
    `);

    console.log("✅ Database Tables Ready");
  } catch (err) {
    console.error("DB Init Error:", err.message);
  }
};

initDb();

// ======================
// ROUTES
// ======================

// GET DATA
app.get('/api/data', async (req, res) => {
  try {
    const [rows] = await query(
      'SELECT config_json FROM site_configs WHERE id = 1'
    );

    if (rows.length > 0) {
      res.json(JSON.parse(rows[0].config_json));
    } else {
      res.json({ message: "No data found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST DATA (SYNC ALL)
app.post('/api/data', async (req, res) => {
  try {
    const data = req.body;
    const configJson = JSON.stringify(data);

    // Save full state
    await query(`
      INSERT INTO site_configs (id, config_json)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE config_json = ?
    `, [configJson, configJson]);

    // USERS
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        await query(`
          INSERT INTO users (email, name, role, registered_at)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE name = ?, role = ?
        `, [u.email, u.name, u.role, u.registeredAt, u.name, u.role]);
      }
    }

    // ORDERS
    if (Array.isArray(data.orders)) {
      for (const o of data.orders) {
        await query(`
          INSERT INTO orders (id, customer_name, phone, total, status, type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status = ?
        `, [o.id, o.customerName, o.phone, o.total, o.status, o.type, o.createdAt, o.status]);
      }
    }

    // BOOKINGS
    if (Array.isArray(data.bookings)) {
      for (const b of data.bookings) {
        await query(`
          INSERT INTO bookings (id, name, guests, date, time, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE status = ?
        `, [b.id, b.name, b.guests, b.date, b.time, b.status, b.createdAt, b.status]);
      }
    }

    res.json({ success: true, message: "Data synced successfully" });

  } catch (err) {
    console.error("SYNC ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// HEALTH CHECK
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: "connected",
      db: "aiven_mysql",
      time: new Date()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      error: err.message
    });
  }
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
