// src/config/index.js
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,

  session: {
    secret: process.env.SESSION_SECRET || 'seuSegredoAqui',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  },

  db: {
    host:     process.env.PGHOST,
    port:     process.env.PGPORT,
    database: process.env.PGDATABASE,
    user:     process.env.PGUSER,
    password: process.env.PGPASSWORD
  },

  paths: {
    public: path.join(__dirname, '../public'),
    views:  path.join(__dirname, '../views')
  }
};
