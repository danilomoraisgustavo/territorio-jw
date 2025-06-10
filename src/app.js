// src/app.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');

const config = require('./config');

const app = express();
const pool = new Pool(config.db);

// middlewares
app.use(cors());
app.use(session(config.session));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// attach db to request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// static + views
app.use(express.static(config.paths.public));
app.get('/',       (req, res) => res.sendFile(path.join(config.paths.views, 'index.html')));
app.get('/forgot', (req, res) => res.sendFile(path.join(config.paths.views, 'forgot.html')));
app.get('/dashboard', isAuthenticated, (req, res) =>
  res.sendFile(path.join(config.paths.views, 'dashboard.html'))
);

// routes
const authRoutes     = require('./routes/authRoutes');
const userRoutes     = require('./routes/userRoutes');
const passwordRoutes = require('./routes/passwordRoutes');

app.use('/',            authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/password', passwordRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

module.exports = app;
