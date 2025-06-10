// src/controllers/passwordController.js
const passwordService = require('../services/passwordService');
const emailService    = require('../services/emailService');

async function sendResetCode(req, res) {
  try {
    const { token } = await passwordService.createResetToken(req.body.email);
    await emailService.sendResetEmail(req.body.email, token);
    res.json({ message: 'Código enviado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function verifyResetCode(req, res) {
  try {
    await passwordService.verifyToken(req.body.token);
    res.json({ message: 'Código válido!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function resetPassword(req, res) {
  try {
    await passwordService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

module.exports = { sendResetCode, verifyResetCode, resetPassword };
