// src/controllers/lotController.js
const lotService = require('../services/lotService');

async function listLotsByTerritory(req, res) {
  const lots = await lotService.listLotsByTerritory(req.params.territoryId);
  res.json(lots);
}

async function listAllLots(req, res) {
  const lots = await lotService.listAllLots();
  res.json(lots);
}

async function toggleLot(req, res) {
  try {
    const lot = await lotService.toggleLot(req.params.id);
    res.json(lot);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

module.exports = {
  listLotsByTerritory,
  listAllLots,
  toggleLot
};
