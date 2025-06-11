// src/controllers/territoryController.js
const territoryService = require('../services/territoryService');

async function listTerritories(req, res) {
  const list = await territoryService.listTerritories();
  res.json(list);
}

async function getTerritory(req, res) {
  try {
    const t = await territoryService.getTerritory(req.params.id);
    res.json(t);
  } catch (e) {
    res.status(404).json({ message: e.message });
  }
}

async function createTerritory(req, res) {
  try {
    const created = await territoryService.createTerritory(req.body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

async function updateTerritory(req, res) {
  try {
    const updated = await territoryService.updateTerritory(
      req.params.id,
      req.body
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

async function deleteTerritory(req, res) {
  try {
    await territoryService.deleteTerritory(req.params.id);
    res.json({ message: 'Território excluído com sucesso!' });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}

module.exports = {
  listTerritories,
  getTerritory,
  createTerritory,
  updateTerritory,
  deleteTerritory
};
