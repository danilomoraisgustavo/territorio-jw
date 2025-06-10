// src/routes/authRoutes.js
const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const isAuthenticated = require('../middlewares/isAuthenticated');

router.post('/login',    authController.login);
router.post('/logout',   authController.logout);
router.post('/register', authController.register);
router.get('/user-info', isAuthenticated, authController.getUserInfo);

module.exports = router;
