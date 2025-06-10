// src/middlewares/isAuthenticated.js
module.exports = function isAuthenticated(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    return next();
  }
  return res.status(401).json({ message: 'Usuário não autenticado' });
};
