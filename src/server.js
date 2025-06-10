// src/server.js
const app    = require('./app');
const config = require('./config');

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${config.port}`);
});
