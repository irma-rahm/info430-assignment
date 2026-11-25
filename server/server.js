require('dotenv').config();
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const sql = require('mssql');

const app = express();
const port = Number(process.env.PORT) || 3000;
const webDirectory = path.join(__dirname, '..', 'web');
const penguinQuery = fs.readFileSync(path.join(__dirname, '..', 'db', 'queries.sql'), 'utf8');
const databaseConfig = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(databaseConfig);
    poolPromise = pool.connect().catch(error => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

app.get('/api/penguins', async (request, response) => {
  const filters = {};
  for (const name of ['species', 'island']) {
    const value = request.query[name];
    if (value !== undefined && typeof value !== 'string') {
      return response.status(400).json({ error: `${name} must be a single text value.` });
    }
    const trimmed = value?.trim() || null;
    if (trimmed && trimmed.length > 30) {
      return response.status(400).json({ error: `${name} must be 30 characters or fewer.` });
    }
    filters[name] = trimmed;
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('species', sql.NVarChar(30), filters.species)
      .input('island', sql.NVarChar(30), filters.island)
      .query(penguinQuery);
    response.json(result.recordset);
  } catch (error) {
    console.error('Could not query penguin data:', error.message);
    response.status(500).json({ error: 'Could not load penguin data. Check the server and database connection.' });
  }
});

app.use(express.static(webDirectory));

app.listen(port, () => {
  console.log(`Penguin Field Notes is running at http://localhost:${port}`);
});
