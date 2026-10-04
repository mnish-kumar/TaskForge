const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// Trust first proxy (if behind a reverse proxy like Nginx or Heroku)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = ['http://localhost:3000', 'https://your-frontend-domain.com'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const error = new Error('The CORS policy for this site does not allow access from the specified origin.');
      return callback(error, false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());
app.use(cookieParser());


// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;