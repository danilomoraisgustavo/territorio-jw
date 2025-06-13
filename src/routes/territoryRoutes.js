const express = require('express');
const router = express.Router();
const territoryController = require('../controllers/territoryController');

router.get('/', territoryController.getAll);
router.get('/:id', territoryController.getOne);
router.put('/:id/lots/:lotIndex', territoryController.updateLot);

module.exports = router;
