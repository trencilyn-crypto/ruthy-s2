import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// FIX PATH
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATABASE CONNECTION
const pool = mysql.createPool({
  host: 'mysql-16fbe6d8-ruthyseatery12.l.aivencloud.com',
  port: 28811,
  user: 'avnadmin',
  password: 'AVNS_b_GwzztL-Efn3ph3zyE',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
});

const db = pool.promise();

// INIT TABLE
const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_configs (
        id INT PRIMARY KEY,
        config_json LONGTEXT
      )
    `);

    console.log('✅ Database connected');
  } catch (err) {
    console.error('DB ERROR:', err.message);
  }
};

initDb();

//
// SAVE DATA TO DATABASE
//
app.post('/api/data', async (req, res) => {
  try {
    const data = JSON.stringify(req.body);

    await db.query(
      `
      INSERT INTO site_configs (id, config_json)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE config_json = ?
      `,
      [data, data]
    );

    res.json({
      success: true,
      message: "Saved to database"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

//
// GET DATA FROM DATABASE
//
app.get('/api/data', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT config_json FROM site_configs WHERE id = 1'
    );

    if (rows.length > 0) {
      res.json(JSON.parse(rows[0].config_json));
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

//
// CHECK DATABASE (TEST)
//
app.get('/api/check', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM site_configs');

    res.json({
      total: rows.length,
      data: rows
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

//
// HEALTH CHECK
//
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

//
// SERVE FRONTEND
//
app.use(express.static(path.join(__dirname, 'dist')));

// FIX ROUTE (important)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

//
// START SERVER
//
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
