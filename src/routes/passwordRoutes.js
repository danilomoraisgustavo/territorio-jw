// src/routes/passwordRoutes.js
const express = require('express');
const router  = express.Router();
const passwordController = require('../controllers/passwordController');

router.post('/send-reset-code',  passwordController.sendResetCode);
router.post('/verify-reset-code',passwordController.verifyResetCode);
router.post('/reset-password',   passwordController.resetPassword);

module.exports = router;
