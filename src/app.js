// src/app.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const isAuthenticated = require('./middlewares/isAuthenticated');
const territoryRoutes = require('./routes/territoryRoutes');


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
app.get('/dashboard',isAuthenticated, (req, res) => res.sendFile(path.join(config.paths.views, 'dashboard.html')));

app.get('/users',    isAuthenticated, (req, res) =>
  res.sendFile(path.join(config.paths.views, 'users.html'))
);
app.get('/reports',  isAuthenticated, (req, res) =>
  res.sendFile(path.join(config.paths.views, 'reports.html'))
);
app.get('/settings', isAuthenticated, (req, res) =>
  res.sendFile(path.join(config.paths.views, 'settings.html'))
);

// routes
const authRoutes     = require('./routes/authRoutes');
const userRoutes     = require('./routes/userRoutes');
const passwordRoutes = require('./routes/passwordRoutes');

app.use('/',            authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/territories', territoryRoutes);

// *** fallback 404 (deve vir por último) ***
app.use((req, res) => {
  res.status(404).sendFile(path.join(config.paths.views, '404.html'));
});



module.exports = app;
