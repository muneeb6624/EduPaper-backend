const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    console.error('Please set these in your Vercel dashboard under Settings > Environment Variables');
  }
}

// Import configurations and middleware
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes/index');

const app = express();

// Connect to MongoDB (with error handling)
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Security and middleware
app.use(helmet()); // Set security headers
app.use(cors()); // Enable CORS
app.use(limiter); // Apply rate limiting
app.use(morgan('combined')); // HTTP request logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'EduPaper API is running successfully',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', routes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to EduPaper API 🎓',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health'
  });
});

// Global error handler (must be after routes)
app.use(errorHandler);

// 404 handler for undefined routes
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`,
//     timestamp: new Date().toISOString()
//   });
// });

// Handle unhandled promise rejections (only in development)
if (process.env.NODE_ENV !== 'production') {
  process.on('unhandledRejection', (err) => {
    console.log(`Unhandled Rejection: ${err.message}`);
  });

  process.on('uncaughtException', (err) => {
    console.log(`Uncaught Exception: ${err.message}`);
  });

  // Start server (only in development)
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 EduPaper Server is running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Export the app for Vercel
module.exports = app;

