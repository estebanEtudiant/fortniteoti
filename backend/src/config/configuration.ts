export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',

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

  ngStripe: {
    secretKey: process.env.NG_STRIPE_SECRET_KEY,
    webhookSecret: process.env.NG_STRIPE_WEBHOOK_SECRET,
  },

  nowpayments: {
    apiKey: process.env.NOWPAYMENTS_API_KEY || '',
    ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
  },

  storefrontUrl: process.env.STOREFRONT_URL || 'http://localhost:3002',
  ngStorefrontUrl: process.env.NG_STOREFRONT_URL || 'https://404tweaks.tech/404Client',
  shopStorefrontUrl: process.env.SHOP_STOREFRONT_URL || 'https://shop.404tweaks.tech',
  apiPublicUrl: process.env.API_PUBLIC_URL || 'https://api.404tweaks.tech/api/v1',

  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '404Tweaks <noreply@fortnite.opti>',
  },

  rateLimit: {
    activation: parseInt(process.env.RATE_LIMIT_ACTIVATION || '5', 10),
    heartbeat: parseInt(process.env.RATE_LIMIT_HEARTBEAT || '60', 10),
    admin: parseInt(process.env.RATE_LIMIT_ADMIN || '100', 10),
    bruteForceMax: parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '10', 10),
    bruteForceBlockDuration: parseInt(process.env.BRUTE_FORCE_BLOCK_DURATION || '600', 10),
  },

  discord: {
    clientId:     process.env.DISCORD_CLIENT_ID     || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri:  process.env.DISCORD_REDIRECT_URI  || 'https://api.404tweaks.tech/api/v1/customer/discord/callback',
    botToken:     process.env.DISCORD_BOT_TOKEN     || '',
    ngGuildId:      process.env.NG_GUILD_ID       || '',
    ngRoleDiscord:  process.env.NG_ROLE_DISCORD   || '',
    ngRoleLicensed: process.env.NG_ROLE_LICENSED  || '',
  },

  forum: {
    cookieName: process.env.FORUM_COOKIE_NAME || '404_forum_session',
    cookieDomain: process.env.FORUM_COOKIE_DOMAIN || '.404tweaks.tech',
    jwtSecret: process.env.FORUM_JWT_SECRET || process.env.FLARUM_HOOK_SECRET || '',
    origin: process.env.FORUM_ORIGIN || 'https://forum.404tweaks.tech',
    customerGroup: process.env.FORUM_CUSTOMER_GROUP || '404-customers',
  },

  backendUrl: process.env.BACKEND_URL || 'https://api.404tweaks.tech',

  minecraft: {
    rconHost: process.env.MINECRAFT_RCON_HOST || '127.0.0.1',
    rconPort: parseInt(process.env.MINECRAFT_RCON_PORT || '25575', 10),
    rconPassword: process.env.MINECRAFT_RCON_PASSWORD || '',
    serviceName: process.env.MINECRAFT_SERVICE_NAME || 'minecraft.service',
    dir: process.env.MINECRAFT_DIR || '/opt/minecraft',
    allocatedRamMb: parseInt(process.env.MINECRAFT_ALLOCATED_RAM_MB || '4096', 10),
    hostPublic: process.env.MINECRAFT_HOST_PUBLIC || '',
    port: parseInt(process.env.MINECRAFT_PORT || '25565', 10),
  },

  // Server-side signature key for offline tokens.
  // Keep a dev fallback for compatibility, but production should set a dedicated secret.
  offlineTokenKey: process.env.OFFLINE_TOKEN_SECRET || process.env.JWT_SECRET,
});
