const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

let db;

if (process.env.AIVEN_URL) {
  const pool = mysql.createPool(process.env.AIVEN_URL);
  db = pool.promise();
  console.log("Connected to Aiven MySQL");
} else {
  console.warn("AIVEN_URL missing");
  db = { query: async () => [[]] };
}

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
