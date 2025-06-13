// src/models/territoryModel.js
const { dbGet, dbAll, dbRun } = require('../utils/db');

async function getAll() {
  return await dbAll(
    'SELECT id, number, zone, geojson, status, updated_at FROM territories',
    []
  );
}

async function getById(id) {
  return await dbGet(
    'SELECT id, number, zone, geojson, status, updated_at FROM territories WHERE id = $1',
    [id]
  );
}

async function create({ number, zone, geojson }) {
  return await dbGet(
    `INSERT INTO territories (number, zone, geojson)
     VALUES ($1, $2, $3)
     RETURNING id, number, zone, geojson, status, updated_at`,
    [number, zone, geojson]
  );
}

async function update(id, { number, zone, geojson }) {
  return await dbGet(
    `UPDATE territories
     SET number = $1, zone = $2, geojson = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id, number, zone, geojson, status, updated_at`,
    [number, zone, geojson, id]
  );
}

async function setStatus(id, status) {
  return await dbGet(
    `UPDATE territories
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, status, updated_at`,
    [status, id]
  );
}

async function deleteById(id) {
  await dbRun('DELETE FROM territories WHERE id = $1', [id]);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  setStatus,
  deleteById
};
