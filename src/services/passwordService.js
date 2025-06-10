// src/services/passwordService.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const resetModel = require('../models/passwordResetModel');

async function createResetToken(email) {
  const user = await userModel.getByEmail(email);
  if (!user) throw new Error('Email não encontrado');
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + 3600 * 1000); // 1h
  await resetModel.deleteByUserId(user.id);
  await resetModel.create(token, user.id, expiresAt);
  return { token, user };
}

async function verifyToken(token) {
  const record = await resetModel.getByToken(token);
  if (!record) throw new Error('Token inválido');
  if (new Date(record.expires_at) < new Date()) {
    await resetModel.deleteByToken(token);
    throw new Error('Token expirado');
  }
  return await userModel.getById(record.user_id);
}

async function resetPassword(token, newPassword) {
  const user = await verifyToken(token);
  const hashed = await bcrypt.hash(newPassword, 10);
  await userModel.updatePassword(user.id, hashed);
  await resetModel.deleteByUserId(user.id);
  return user;
}

module.exports = {
  createResetToken,
  verifyToken,
  resetPassword
};
