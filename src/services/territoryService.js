const territoryModel = require('../models/territoryModel');

async function getAllTerritories() {
    return await territoryModel.getAllTerritories();
}

async function getTerritory(id) {
    return await territoryModel.getTerritoryById(id);
}

async function updateLotStatus(id, lotIndex, doneStatus) {
    const territory = await territoryModel.getTerritoryById(id);
    if (!territory) {
        throw new Error('Territory not found');
    }
    let geojson = territory.geojson;
    if (typeof geojson === 'string') {
        geojson = JSON.parse(geojson);
    }
    if (!geojson || !geojson.features || geojson.features.length <= lotIndex) {
        throw new Error('Invalid lot index');
    }
    const feature = geojson.features[lotIndex];
    if (!feature.properties) {
        feature.properties = {};
    }
    const currentDone = feature.properties.done === true;
    const newDone = (doneStatus !== undefined) ? doneStatus : !currentDone;
    feature.properties.done = newDone;
    let allDone = true;
    for (const f of geojson.features) {
        if (!f.properties || f.properties.done !== true) {
            allDone = false;
            break;
        }
    }
    const newStatus = allDone ? true : false;
    let updatedAt = territory.updated_at;
    if (newDone === true) {
        updatedAt = new Date();
    }
    await territoryModel.updateTerritory(id, geojson, newStatus, updatedAt);
    return {
        status: newStatus,
        updated_at: updatedAt
    };
}

module.exports = {
    getAllTerritories,
    getTerritory,
    updateLotStatus
};
