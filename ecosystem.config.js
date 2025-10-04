module.exports = {
  apps: [{
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
  }]
};
