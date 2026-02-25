module.exports = {
  apps: [
    {
      name:         'fortniteopt-bot',
      script:       'src/index.js',
      instances:    1,
      autorestart:  true,
      watch:        false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      // Logs PM2
      out_file:  './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
