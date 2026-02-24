export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  hwid: {
    salt: process.env.HWID_SALT,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:3002',

  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'FortniteOpti <noreply@fortnite.opti>',
  },

  rateLimit: {
    activation: parseInt(process.env.RATE_LIMIT_ACTIVATION || '5', 10),
    heartbeat: parseInt(process.env.RATE_LIMIT_HEARTBEAT || '60', 10),
    admin: parseInt(process.env.RATE_LIMIT_ADMIN || '100', 10),
    bruteForceMax: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '10', 10),
    bruteForceBlockDuration: parseInt(process.env.BRUTE_FORCE_BLOCK_DURATION || '600', 10),
  },

  // Server-side signature key for offline tokens
  offlineTokenKey: process.env.JWT_SECRET, // Reuse JWT secret for HMAC
});
