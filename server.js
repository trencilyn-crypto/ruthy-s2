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

// =====================
// DATABASE CONNECTION
// =====================
let db;

if (process.env.AIVEN_URL) {
  const pool = mysql.createPool(process.env.AIVEN_URL);
  db = pool.promise();
  console.log("✅ Connected to Aiven MySQL");
} else {
  console.warn("⚠️ AIVEN_URL not set. Using mock DB.");
  db = {
    query: async () => [[{ config_json: "{}" }]],
  };
}

// =====================
// INIT DB
// =====================
const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_configs (
        id INT PRIMARY KEY,
        config_json LONGTEXT
      )
    `);
    console.log("✅ Database Ready");
  } catch (err) {
    console.error("❌ DB Init Error:", err.message);
  }
};

initDb();

// =====================
// API ROUTES
// =====================
app.get('/api/data', async (req, res) => {
  try {
    const [rows] = await db.query(
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

app.post('/api/data', async (req, res) => {
  try {
    const config = JSON.stringify(req.body);

    await db.query(`
      INSERT INTO site_configs (id, config_json)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE config_json = ?
    `, [config, config]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: "connected",
      db: "aiven_mysql",
      time: new Date()
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// =====================
// FRONTEND STATIC (IMPORTANT)
// =====================
const path = require('path');

app.use(express.static(path.join(__dirname, 'dist')));

// ✅ FIXED ROUTE (NO /* !!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// =====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
