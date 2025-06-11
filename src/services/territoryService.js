// src/services/territoryService.js
const territoryModel = require('../models/territoryModel');

async function listTerritories() {
  return await territoryModel.getAll();
}

async function getTerritory(id) {
  const t = await territoryModel.getById(id);
  if (!t) throw new Error('Território não encontrado');
  return t;
}

async function createTerritory(data) {
  return await territoryModel.create(data);
}

async function updateTerritory(id, data) {
  return await territoryModel.update(id, data);
}

async function deleteTerritory(id) {
  await territoryModel.deleteById(id);
}

module.exports = {
  listTerritories,
  getTerritory,
  createTerritory,
  updateTerritory,
  deleteTerritory
};
