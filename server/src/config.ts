import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Role configuration
const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const ROLE_MAPPINGS = {
  sales: {
    emails: (process.env.SALES_HEAD_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    functionValue: 'Sales Initiative',
  },
  delivery: {
    emails: (process.env.DELIVERY_HEAD_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    functionValue: 'Delivery',
  },
  tech: {
    emails: (process.env.TECH_HEAD_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    functionValue: 'Tech',
  },
  product: {
    emails: (process.env.PRODUCT_HEAD_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    functionValue: 'Product',
  },
};

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
  roles: {
    superAdmins: SUPER_ADMINS,
    mappings: ROLE_MAPPINGS,
  },
};

// Helper functions
export function getUserRole(userEmail: string): 'super_admin' | 'sales_head' | 'delivery_head' | 'tech_head' | 'product_head' | 'user' {
  const email = userEmail.toLowerCase().trim();

  if (config.roles.superAdmins.includes(email)) {
    return 'super_admin';
  }

  if (config.roles.mappings.sales.emails.includes(email)) {
    return 'sales_head';
  }

  if (config.roles.mappings.delivery.emails.includes(email)) {
    return 'delivery_head';
  }

  if (config.roles.mappings.tech.emails.includes(email)) {
    return 'tech_head';
  }

  if (config.roles.mappings.product.emails.includes(email)) {
    return 'product_head';
  }

  return 'user';
}

export function getRoleFunctionFilter(role: string): string | null {
  switch (role) {
    case 'sales_head':
      return config.roles.mappings.sales.functionValue;
    case 'delivery_head':
      return config.roles.mappings.delivery.functionValue;
    case 'tech_head':
      return config.roles.mappings.tech.functionValue;
    case 'product_head':
      return config.roles.mappings.product.functionValue;
    default:
      return null;
  }
}
