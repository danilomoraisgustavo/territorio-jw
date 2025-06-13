const pool = require('../db');

async function getAllTerritories() {
    const result = await pool.query('SELECT id, number, zone, geojson, status, updated_at FROM territories');
    return result.rows;
}

async function getTerritoryById(id) {
    const result = await pool.query('SELECT id, number, zone, geojson, status, updated_at FROM territories WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

async function updateTerritory(id, geojson, status, updatedAt) {
    await pool.query('UPDATE territories SET geojson = $1, status = $2, updated_at = $3 WHERE id = $4', [JSON.stringify(geojson), status, updatedAt, id]);
    return true;
}

module.exports = {
    getAllTerritories,
    getTerritoryById,
    updateTerritory
};
