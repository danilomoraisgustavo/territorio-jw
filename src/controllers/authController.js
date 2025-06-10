// src/controllers/authController.js
const authService = require('../services/authService');
const userService = require('../services/userService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await authService.authenticateUser(email, password);
    req.session.isLoggedIn = true;
    req.session.userId = user.id;
    res.json({ message: 'Login bem-sucedido', redirect: '/dashboard' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

function logout(req, res) {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Erro ao fazer logout' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout bem-sucedido' });
  });
}

async function register(req, res) {
  try {
    const { username, email, endereco, celular, password } = req.body;
    await authService.registerUser({
      username,
      email,
      endereco,
      celular,
      password,
      designacao: 'Dirigente'
    });
    res.status(201).json({ message: 'Usuário registrado com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

async function getUserInfo(req, res) {
  try {
    const user = await userService.getUserInfo(req.session.userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    // inclui o email aqui:
    res.json({
      username:   user.username,
      designacao: user.designacao,
      email:      user.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro servidor' });
  }
}

module.exports = { login, logout, register, getUserInfo };
