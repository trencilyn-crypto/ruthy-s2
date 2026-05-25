import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());

// =====================
// SAFE DATABASE SETUP
// =====================
let db = null;

function connectDB() {
  if (!process.env.AIVEN_URL) {
    console.warn("⚠ AIVEN_URL is NOT set. Running in OFFLINE mode.");
    return null;
  }

  const pool = mysql.createPool(process.env.AIVEN_URL);
  return pool.promise();
}

db = connectDB();

// =====================
// INIT DB (SAFE)
// =====================
async function initDB() {
  if (!db) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_data (
        id INT PRIMARY KEY,
        data LONGTEXT
      )
    `);

    console.log("✅ Database tables ready");
  } catch (err) {
    console.error("DB INIT ERROR:", err.message);
  }
}

initDB();

// =====================
// ROOT ROUTE
// =====================
app.get("/", (req, res) => {
  res.send("🚀 Ruthy Backend is Running Successfully");
});

// =====================
// HEALTH CHECK
// =====================
app.get("/api/health", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        status: "no-db",
        message: "AIVEN_URL not set"
      });
    }

    await db.query("SELECT 1");

    res.json({
      status: "connected",
      db: "ok"
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

// =====================
// SAVE DATA (FROM REACT)
// =====================
app.post("/api/data", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        error: "Database not connected"
      });
    }

    const json = JSON.stringify(req.body);

    await db.query(
      `
      INSERT INTO site_data (id, data)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE data = ?
    `,
      [json, json]
    );

    res.json({
      success: true,
      message: "Data saved"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// =====================
// GET DATA
// =====================
app.get("/api/data", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        error: "Database not connected"
      });
    }

    const [rows] = await db.query(
      "SELECT data FROM site_data WHERE id = 1"
    );

    if (!rows.length) {
      return res.json({ message: "No data yet" });
    }

    res.json(JSON.parse(rows[0].data));
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// =====================
// 404 HANDLER (NO path-to-regexp ERROR)
// =====================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
