// src/routes/userRoutes.js
const express = require('express');
const router  = express.Router();
const userController  = require('../controllers/userController');
const authorizeRoles = require('../middlewares/authorizeRoles');
const roles = ['Administrador', 'Superintendente de Serviço', 'Superintendente de Território'];

router.get('/count',       authorizeRoles(roles), userController.countUsers);
router.get('/',            authorizeRoles(roles), userController.listUsers);
router.get('/:id',         authorizeRoles(roles), userController.getUser);
router.post('/',           authorizeRoles(roles), userController.createUser);
router.put('/:id',         authorizeRoles(roles), userController.updateUser);
router.delete('/:id',      authorizeRoles(roles), userController.deleteUser);
router.post('/:id/accept',   authorizeRoles(roles), userController.acceptUser);
router.post('/:id/restrict',  authorizeRoles(roles), userController.restrictUser);

module.exports = router;
