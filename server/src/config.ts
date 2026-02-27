import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  isProduction: process.env.NODE_ENV === 'production',
  sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  asana: {
    clientId: process.env.ASANA_CLIENT_ID || '',
    clientSecret: process.env.ASANA_CLIENT_SECRET || '',
    redirectUri: process.env.ASANA_REDIRECT_URI || 'http://localhost:3001/auth/asana/callback',
  },
};
