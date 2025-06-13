// src/services/lotService.js
const lotModel       = require('../models/lotModel');
const territoryService = require('./territoryService');

async function listLotsByTerritory(territoryId) {
  // reset stale >6mo
  await lotModel.dbRun(
    `UPDATE lots
     SET status = FALSE
     WHERE updated_at < NOW() - INTERVAL '6 months'`
  );
  return await lotModel.getByTerritory(territoryId);
}

async function listAllLots() {
  await lotModel.dbRun(
    `UPDATE lots
     SET status = FALSE
     WHERE updated_at < NOW() - INTERVAL '6 months'`
  );
  return await lotModel.getAll();
}

async function toggleLot(id) {
  const lot = await lotModel.toggleStatus(id);
  const lots = await lotModel.getByTerritory(lot.territory_id);
  const allDone = lots.every(l => l.status);
  await territoryService.setTerritoryStatus(lot.territory_id, allDone);
  return lot;
}

module.exports = {
  listLotsByTerritory,
  listAllLots,
  toggleLot
};
