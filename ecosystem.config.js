module.exports = {
  apps: [
    {
      name: 'freshsales-sync',
      script: 'freshsales-sync-service.js',
      args: 'start',
      cwd: '/root/pre-sales-monitoring',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      kill_timeout: 5000
    }
    // status-verification DISABLED - FreshSales automation no longer interferes with contact_status_id
    // Proven unnecessary on 2025-10-11 after disabling "When child is added, change parent's stage to Lead" rule
    // Debug logs showed 0 fixes needed consistently
    /*
    {
      name: 'status-verification',
      script: 'status-verification-service.js',
      cwd: '/root/pre-sales-monitoring',
      instances: 1,
      autorestart: false,
      cron_restart: '8 * * * *', // Run at :08 (3 min after forward sync at :05) - DISABLED
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/status-verification-error.log',
      out_file: './logs/status-verification-out.log',
      time: true
    }
    */
  ]
};
