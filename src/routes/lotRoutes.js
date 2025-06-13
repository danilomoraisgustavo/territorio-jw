// src/routes/lotRoutes.js
const express = require('express');
const router  = express.Router();
const isAuth  = require('../middlewares/isAuthenticated');
const lc      = require('../controllers/lotController');

router.use(isAuth);

router.get('/territories/:territoryId/lots', lc.listLotsByTerritory);
router.get('/lots',                    lc.listAllLots);
router.put('/lots/:id/toggle',         lc.toggleLot);

module.exports = router;
