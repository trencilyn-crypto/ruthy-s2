import express from "express";
import mysql from "mysql2";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// =======================
// DATABASE CONNECTION
// =======================
let db;

if (!process.env.AIVEN_URL) {
  console.error("❌ AIVEN_URL is missing in Render environment variables");
  process.exit(1);
}

const pool = mysql.createPool(process.env.AIVEN_URL);
db = pool.promise();

console.log("✅ Database pool created");

// =======================
// INIT TABLE
// =======================
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_data (
        id INT PRIMARY KEY,
        data LONGTEXT
      )
    `);

    console.log("✅ Table ready");
  } catch (err) {
    console.error("DB INIT ERROR:", err.message);
  }
}

initDB();

// =======================
// ROOT ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Ruthy Backend Running Successfully");
});

// =======================
// HEALTH CHECK
// =======================
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "connected", db: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// =======================
// SAVE DATA (FROM REACT)
// =======================
app.post("/api/data", async (req, res) => {
  try {
    const data = JSON.stringify(req.body);

    await db.query(
      `
      INSERT INTO site_data (id, data)
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE data = ?
    `,
      [data, data]
    );

    res.json({ success: true, message: "Data saved to database" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// GET DATA
// =======================
app.get("/api/data", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT data FROM site_data WHERE id = 1"
    );

    if (!rows.length) {
      return res.json({ message: "No data yet" });
    }

    res.json(JSON.parse(rows[0].data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
