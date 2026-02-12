import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';
import passport from 'passport';

// Import our modules
import routes from './routes/index.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import connectDB from './config/database.js';
import './config/googleAuth.js';

// Load environment variables
dotenv.config();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Verify production mode
if (NODE_ENV === 'production') {
  console.log('🚀 Server running in PRODUCTION mode');
} else {
  console.warn('⚠️ Server running in DEVELOPMENT mode');
}

// Debug environment variables
console.log('🔍 Environment check on server start:');
console.log('  - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
console.log('  - NODE_ENV:', NODE_ENV);
console.log('  - PORT:', PORT);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting for all routes
app.use(apiRateLimiter);

// Session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});



// Connect to MongoDB
connectDB();

// Initialize services
console.log('🚀 Starting Advanced AI Assistant...');

// Check service availability
const checkServices = () => {
  const services = {
    openai: !!process.env.OPENAI_API_KEY,
    analytics: true, // Always available since it's in-memory
    chatHistory: true, // Always available since it's in-memory
    modelComparison: true, // Always available since it's in-memory
    usageTracking: true, // Always available since it's in-memory
    security: true, // Always available since middleware is loaded
    compression: true, // Always available since middleware is loaded
    rateLimiting: true // Always available since middleware is loaded
  };
  return services;
};

// Mount routes
app.use('/', routes);

// Global error handling middleware
app.use(globalErrorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  const services = checkServices();
  
  console.log(`
🚀 Advanced AI Assistant API Started!
📍 Environment: ${NODE_ENV}
🌐 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
🤖 AI Models: ${services.openai ? '✅ Available' : '❌ Not Available'}
📊 Analytics: ${services.analytics ? '✅ Enabled' : '❌ Disabled'}
💬 Chat History: ${services.chatHistory ? '✅ Enabled' : '❌ Disabled'}
🔍 Model Comparison: ${services.modelComparison ? '✅ Available' : '❌ Not Available'}
📈 Usage Tracking: ${services.usageTracking ? '✅ Active' : '❌ Inactive'}
🛡️ Security: ${services.security ? '✅ Active' : '❌ Inactive'}
⚡ Compression: ${services.compression ? '✅ Active' : '❌ Inactive'}
🚦 Rate Limiting: ${services.rateLimiting ? '✅ Active' : '❌ Inactive'}
⏰ Started at: ${new Date().toISOString()}
  `);
});  // 📧 Email Service: ${emailService.isInitialized ? '✅ Connected' : '❌ Disconnected'}


// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app; 
