import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { config, getUserRole } from '../config.js';

const router = Router();

// Step 1: Redirect user to Asana authorization page
router.get('/asana', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: config.asana.clientId,
    redirect_uri: config.asana.redirectUri,
    response_type: 'code',
    state: state,
  });

  res.redirect(`https://app.asana.com/-/oauth_authorize?${params}`);
});

// Step 2: Handle OAuth callback
router.get('/asana/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate CSRF state
  if (state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://app.asana.com/-/oauth_token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.asana.clientId,
        client_secret: config.asana.clientSecret,
        redirect_uri: config.asana.redirectUri,
        code: code as string,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in, data: userData } = tokenResponse.data;

    // Store in session
    req.session.asana = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      user: {
        gid: userData.id,
        name: userData.name,
        email: userData.email,
      },
    };

    // Redirect to frontend dashboard
    res.redirect(config.frontendUrl);
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
});

// Step 3: Token refresh (call before expired requests)
router.post('/refresh', async (req, res) => {
  if (!req.session.asana?.refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

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

    const { access_token, refresh_token, expires_in } = response.data;

    req.session.asana.accessToken = access_token;
    req.session.asana.refreshToken = refresh_token;
    req.session.asana.expiresAt = Date.now() + expires_in * 1000;

    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Refresh failed' });
  }
});

// Get current user info
router.get('/me', (req, res) => {
  if (!req.session.asana) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.session.asana.user;
  const role = getUserRole(user.email || '');

  res.json({
    user: {
      ...user,
      role,
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
