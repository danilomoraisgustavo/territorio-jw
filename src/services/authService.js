// src/services/authService.js
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

async function registerUser({ username, email, endereco, celular, password, designacao }) {
  const existing = await userModel.getByEmail(email);
  if (existing) throw new Error('E-mail já cadastrado');
  const hashed = await bcrypt.hash(password, 10);
  return await userModel.create({
    username, email, endereco, celular,
    password: hashed,
    designacao,
    init: false
  });
}

async function authenticateUser(email, password) {
  const user = await userModel.getByEmail(email);
  if (!user) throw new Error('Email não encontrado');
  if (!user.init) throw new Error('Usuário não autorizado');
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Senha incorreta');
  return user;
}

module.exports = {
  registerUser,
  authenticateUser
};
