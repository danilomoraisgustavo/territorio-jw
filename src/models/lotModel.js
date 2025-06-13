// src/models/lotModel.js
const { dbGet, dbAll, dbRun } = require('../utils/db');

async function getByTerritory(territoryId) {
  return await dbAll(
    `SELECT id, territory_id, geojson, status, updated_at
     FROM lots WHERE territory_id = $1`,
    [territoryId]
  );
}

async function getAll() {
  return await dbAll(
    `SELECT id, territory_id, geojson, status, updated_at FROM lots`,
    []
  );
}

async function toggleStatus(id) {
  const lot = await dbGet(
    `UPDATE lots
     SET status = NOT status, updated_at = NOW()
     WHERE id = $1
     RETURNING id, territory_id, status, updated_at`,
    [id]
  );
  return lot;
}

async function deleteByTerritory(territoryId) {
  await dbRun(`DELETE FROM lots WHERE territory_id = $1`, [territoryId]);
}

module.exports = {
  getByTerritory,
  getAll,
  toggleStatus,
  deleteByTerritory
};
