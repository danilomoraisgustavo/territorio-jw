// src/routes/territoryRoutes.js
const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middlewares/isAuthenticated');
const territoryController = require('../controllers/territoryController');

router.use(isAuthenticated);

router.get('/',    territoryController.listTerritories);
router.get('/:id', territoryController.getTerritory);
router.post('/',   territoryController.createTerritory);
router.put('/:id', territoryController.updateTerritory);
router.delete('/:id', territoryController.deleteTerritory);

module.exports = router;
