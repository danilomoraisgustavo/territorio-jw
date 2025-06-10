// src/middlewares/authorizeRoles.js
const { dbGet } = require('../utils/db');

module.exports = function authorizeRoles(allowedRoles) {
  return async (req, res, next) => {
    if (!req.session || !req.session.isLoggedIn) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    try {
      const userId = req.session.userId;
      const user = await dbGet('SELECT designacao FROM users WHERE id = $1', [userId]);
      if (user && allowedRoles.includes(user.designacao)) {
        return next();
      }
      return res.status(403).json({ message: 'Acesso negado' });
    } catch (error) {
      console.error('Erro no middleware de autorização:', error);
      return res.status(500).json({ message: 'Erro no servidor' });
    }
  };
};
