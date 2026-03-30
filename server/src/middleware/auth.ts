import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config, getUserRole } from '../config.js';

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

/**
 * Middleware to validate field-level permissions for delivery metrics
 * - Super admins can edit all fields
 * - Delivery heads can edit: cost, committed_delivery_date
 * - Sales heads can edit: price, committed_delivery_date
 * - Other users cannot edit any fields
 */
export function validateFieldPermissions(req: Request, res: Response, next: NextFunction) {
  if (!req.session.asana?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userEmail = req.session.asana.user.email;
  const role = getUserRole(userEmail);
  const requestBody = req.body;

  // Super admins can edit everything
  if (role === 'super_admin') {
    return next();
  }

  // Check which fields are being edited
  const editableFields: string[] = [];

  if (role === 'delivery_head') {
    editableFields.push('cost', 'committed_delivery_date', 'asana_task_gid', 'project_name');
  } else if (role === 'sales_head') {
    editableFields.push('price', 'committed_delivery_date', 'asana_task_gid', 'project_name');
  } else {
    // Regular users cannot edit any fields
    return res.status(403).json({
      error: 'You do not have permission to edit delivery metrics',
      role: role,
    });
  }

  // Check if user is trying to edit forbidden fields
  const requestedFields = Object.keys(requestBody).filter(
    (key) => requestBody[key] !== undefined && requestBody[key] !== null
  );

  const forbiddenFields = requestedFields.filter((field) => !editableFields.includes(field));

  if (forbiddenFields.length > 0) {
    return res.status(403).json({
      error: `You do not have permission to edit these fields: ${forbiddenFields.join(', ')}`,
      role: role,
      allowedFields: editableFields.filter(f => f !== 'asana_task_gid' && f !== 'project_name'),
    });
  }

  next();
}
