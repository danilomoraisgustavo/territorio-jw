// src/models/userModel.js
const { dbGet, dbAll, dbRun } = require('../utils/db');

async function getByEmail(email) {
  return await dbGet('SELECT * FROM users WHERE email = $1', [email]);
}

async function getById(id) {
  return await dbGet('SELECT * FROM users WHERE id = $1', [id]);
}

async function create({ username, email, endereco, celular, password, designacao, init }) {
  const sql = `
    INSERT INTO users (username, email, endereco, celular, password, designacao, init)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  return await dbGet(sql, [username, email, endereco, celular, password, designacao, init]);
}

async function update(id, { username, email, endereco, celular, designacao }) {
  const sql = `
    UPDATE users
    SET username = $1, email = $2, endereco = $3, celular = $4, designacao = $5
    WHERE id = $6
    RETURNING *
  `;
  return await dbGet(sql, [username, email, endereco, celular, designacao, id]);
}

async function updatePassword(id, hashedPassword) {
  const sql = `
    UPDATE users
    SET password = $1
    WHERE id = $2
  `;
  await dbRun(sql, [hashedPassword, id]);
}

async function deleteById(id) {
  await dbRun('DELETE FROM users WHERE id = $1', [id]);
}

async function countAll() {
  const row = await dbGet('SELECT COUNT(*) AS count FROM users', []);
  return parseInt(row.count, 10);
}

async function getAll() {
  return await dbAll(
    'SELECT id, username, email, endereco, celular, designacao, init FROM users',
    []
  );
}

module.exports = {
  getByEmail,
  getById,
  create,
  update,
  updatePassword,
  deleteById,
  countAll,
  getAll
};
