const territoryService = require('../services/territoryService');

async function getAll(req, res) {
    try {
        const territories = await territoryService.getAllTerritories();
        res.status(200).json(territories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getOne(req, res) {
    try {
        const territoryId = parseInt(req.params.id);
        const territory = await territoryService.getTerritory(territoryId);
        if (!territory) {
            return res.status(404).json({ error: 'Territory not found' });
        }
        res.status(200).json(territory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateLot(req, res) {
    try {
        const territoryId = parseInt(req.params.id);
        const lotIndex = parseInt(req.params.lotIndex);
        const doneStatus = req.body.done;
        const result = await territoryService.updateLotStatus(territoryId, lotIndex, doneStatus);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = {
    getAll,
    getOne,
    updateLot
};
