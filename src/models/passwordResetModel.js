// src/models/passwordResetModel.js
const { dbRun, dbGet, dbAll } = require('../utils/db');

async function create(token, userId, expiresAt) {
  const sql = `
    INSERT INTO password_resets (user_id, token, expires_at)
    VALUES ($1, $2, $3)
  `;
  await dbRun(sql, [userId, token, expiresAt]);
}

async function getByToken(token) {
  return await dbGet(
    'SELECT * FROM password_resets WHERE token = $1',
    [token]
  );
}

async function deleteByToken(token) {
  await dbRun('DELETE FROM password_resets WHERE token = $1', [token]);
}

async function deleteByUserId(userId) {
  await dbRun('DELETE FROM password_resets WHERE user_id = $1', [userId]);
}

module.exports = {
  create,
  getByToken,
  deleteByToken,
  deleteByUserId
};
