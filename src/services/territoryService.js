// src/services/territoryService.js
const territoryModel = require('../models/territoryModel');
const lotModel       = require('../models/lotModel');

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
  await lotModel.deleteByTerritory(id);
  await territoryModel.deleteById(id);
}

async function setTerritoryStatus(id, status) {
  return await territoryModel.setStatus(id, status);
}

module.exports = {
  listTerritories,
  getTerritory,
  createTerritory,
  updateTerritory,
  deleteTerritory,
  setTerritoryStatus
};
