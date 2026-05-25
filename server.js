import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// ======================
// MYSQL CONNECTION
// ======================
let db;

if (process.env.AIVEN_URL) {
  const pool = mysql.createPool(process.env.AIVEN_URL);
  db = pool.promise();
  console.log("✅ Database Connected (Aiven)");
} else {
  console.warn("⚠ AIVEN_URL not set!");
  db = {
    query: async () => [],
  };
}

// ======================
// INIT DATABASE
// ======================
const initDb = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_configs (
        id INT PRIMARY KEY,
        config_json LONGTEXT
      )
    `);

    console.log("✅ Tables Ready");
  } catch (err) {
    console.error("DB Init Error:", err.message);
  }
};

initDb();

// ======================
// ROUTES
// ======================

// Root route (FIX for "Cannot GET /")
app.get("/", (req, res) => {
  res.send("🚀 Ruthy Backend is Running");
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "connected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET data
app.get("/api/data", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT config_json FROM site_configs WHERE id = 1"
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No data found" });
    }

    res.json(JSON.parse(rows[0].config_json));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST data (SAVE TO DB)
app.post("/api/data", async (req, res) => {
  try {
    const config = JSON.stringify(req.body);

    await db.query(
      `INSERT INTO site_configs (id, config_json)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE config_json = ?`,
      [config, config]
    );

    res.json({ success: true, message: "Saved to database" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// FIX FOR "path-to-regexp" ERROR
// DO NOT use "/*" or "*"
// ======================
app.get("*", (req, res) => {
  res.status(404).send("Route not found");
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
