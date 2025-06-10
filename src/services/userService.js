// src/services/userService.js
const userModel = require('../models/userModel');

async function getUserInfo(userId) {
  return await userModel.getById(userId);
}

async function listUsers() {
  return await userModel.getAll();
}

async function countUsers() {
  return await userModel.countAll();
}

async function updateUser(id, data) {
  return await userModel.update(id, data);
}

async function deleteUser(id) {
  await userModel.deleteById(id);
}

async function acceptUser(id) {
  return await userModel.update(id, { ...await userModel.getById(id), init: true });
}

async function restrictUser(id) {
  return await userModel.update(id, { ...await userModel.getById(id), init: false });
}

module.exports = {
  getUserInfo,
  listUsers,
  countUsers,
  updateUser,
  deleteUser,
  acceptUser,
  restrictUser
};
