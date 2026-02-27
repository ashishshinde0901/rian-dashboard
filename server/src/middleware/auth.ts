import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.asana?.accessToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Auto-refresh if token is about to expire (within 5 minutes)
  if (req.session.asana.expiresAt - Date.now() < 5 * 60 * 1000) {
    try {
      const response = await axios.post(
        'https://app.asana.com/-/oauth_token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.asana.clientId,
          client_secret: config.asana.clientSecret,
          refresh_token: req.session.asana.refreshToken,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      req.session.asana.accessToken = response.data.access_token;
      req.session.asana.refreshToken = response.data.refresh_token;
      req.session.asana.expiresAt = Date.now() + response.data.expires_in * 1000;
    } catch (error) {
      return res.status(401).json({ error: 'Token refresh failed. Re-login required.' });
    }
  }

  next();
}
