// ecosystem.config.js
// PM2 configuration for Next.js application

module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/nextjs-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '/var/www/nextjs-app/.env.production',
    error_file: '/var/www/nextjs-app/logs/err.log',
    out_file: '/var/www/nextjs-app/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
  }]
};