// src/utils/db.js
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.db);

async function dbGet(queryText, params) {
  const { rows } = await pool.query(queryText, params);
  return rows[0];
}

async function dbAll(queryText, params) {
  const { rows } = await pool.query(queryText, params);
  return rows;
}

async function dbRun(queryText, params) {
  await pool.query(queryText, params);
}

module.exports = {
  pool,
  dbGet,
  dbAll,
  dbRun,
};
