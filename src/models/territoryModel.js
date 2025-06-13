// src/models/territoryModel.js
const { dbGet, dbAll, dbRun } = require('../utils/db');

async function getAll() {
  return await dbAll(
    'SELECT id, number, zone, geojson FROM territories',
    []
  );
}

async function getById(id) {
  return await dbGet(
    'SELECT id, number, zone, geojson FROM territories WHERE id = $1',
    [id]
  );
}

async function create({ number, zone, geojson }) {
  const sql = `
    INSERT INTO territories (number, zone, geojson)
    VALUES ($1, $2, $3)
    RETURNING id, number, zone, geojson
  `;
  return await dbGet(sql, [number, zone, geojson]);
}

async function update(id, { number, zone, geojson }) {
  const sql = `
    UPDATE territories
    SET number = $1,
        zone   = $2,
        geojson = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING id, number, zone, geojson
  `;
  return await dbGet(sql, [number, zone, geojson, id]);
}

async function deleteById(id) {
  await dbRun(
    'DELETE FROM territories WHERE id = $1',
    [id]
  );
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  deleteById
};
