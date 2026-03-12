import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import emailRoutes from './routes/email.js';
import { SchedulerService } from './services/scheduler.js';

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

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`📊 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔐 OAuth Redirect: ${config.asana.redirectUri}`);

  // Start daily email scheduler
  SchedulerService.startDailyEmailScheduler();
});
