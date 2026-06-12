import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import emailRoutes from './routes/email.js';
import deliveryRoutes from './routes/delivery.js';
import mediaRianRoutes from './routes/mediaRian.js';
import masterAIRoutes from './routes/masterAI.js';
import { SchedulerService } from './services/scheduler.js';
import { initializeDatabase } from './db/database.js';

const app = express();

// CORS for frontend
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: config.isProduction, // Trust Railway's proxy
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: config.isProduction ? 'none' : 'lax',
    },
  })
);

// Routes
app.use('/auth', authRoutes);
app.use('/api', taskRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/media-rian', mediaRianRoutes);
app.use('/api/master-ai', masterAIRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🔧 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: config.port,
      FRONTEND_URL: config.frontendUrl,
      IS_PRODUCTION: config.isProduction,
    });

    // Initialize database schema
    await initializeDatabase();

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${config.port}`);
      console.log(`📊 Frontend URL: ${config.frontendUrl}`);
      console.log(`🔐 OAuth Redirect: ${config.asana.redirectUri}`);

      // Start daily email scheduler
      SchedulerService.startDailyEmailScheduler();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.port} is already in use`);
      } else {
        console.error('❌ Server error:', err);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
