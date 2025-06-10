// src/controllers/userController.js
const userService = require('../services/userService');
const authService = require('../services/authService');

async function countUsers(req, res) {
  const count = await userService.countUsers();
  res.json({ count });
}

async function listUsers(req, res) {
  const users = await userService.listUsers();
  res.json(users);
}

async function getUser(req, res) {
  const user = await userService.getUserInfo(req.params.id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
}

async function createUser(req, res) {
  try {
    await authService.registerUser({ 
      ...req.body, 
      designacao: req.body.designacao || 'Dirigente' 
    });
    res.status(201).json({ message: 'Usuário adicionado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function updateUser(req, res) {
  try {
    await userService.updateUser(req.params.id, req.body);
    res.json({ message: 'Usuário atualizado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function deleteUser(req, res) {
  await userService.deleteUser(req.params.id);
  res.json({ message: 'Usuário excluído com sucesso!' });
}

async function acceptUser(req, res) {
  await userService.acceptUser(req.params.id);
  res.json({ message: 'Acesso do usuário aceito com sucesso!' });
}

async function restrictUser(req, res) {
  await userService.restrictUser(req.params.id);
  res.json({ message: 'Acesso do usuário restringido com sucesso!' });
}

module.exports = {
  countUsers,
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  acceptUser,
  restrictUser
};
