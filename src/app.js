const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

// Trust first proxy (if behind a reverse proxy like Nginx or Heroku)
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

module.exports = app;