#!/bin/bash
# ==============================================================================
# EC2 BOOTSTRAP SCRIPT - PASTE THIS IN USER DATA SECTION
# This script runs automatically when EC2 instance is created
# ==============================================================================

set -e  # Exit on any error

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "=========================================="
echo "Starting EC2 Bootstrap Process"
echo "=========================================="

# Update system
echo "[1/8] Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Node.js 20.x (LTS)
echo "[2/8] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
echo "[3/8] Installing PM2..."
npm install -g pm2

# Install Nginx
echo "[4/8] Installing Nginx..."
apt-get install -y nginx

# Create application directory structure
echo "[5/8] Setting up application directories..."
mkdir -p /var/www/nextjs-app
mkdir -p /var/www/nextjs-app/logs
chown -R ubuntu:ubuntu /var/www/nextjs-app

# ============================================================================
# CREATE ENVIRONMENT VARIABLES FILE
# ============================================================================
echo "[6/8] Creating environment variables file..."

cat > /var/www/nextjs-app/.env.production << 'ENV_FILE'
# ==============================================================================
# PRODUCTION ENVIRONMENT VARIABLES
# ==============================================================================

NODE_ENV=production
PORT=3000

# ==============================================================================
# REPLACE THESE WITH YOUR ACTUAL VALUES
# ==============================================================================

# MongoDB Connection (REQUIRED - Replace with your MongoDB URI)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# NextAuth Configuration (If using authentication)
NEXTAUTH_URL=http://YOUR_EC2_IP_OR_DOMAIN
NEXTAUTH_SECRET=your-super-secret-key-here-change-this-to-random-string

# API Configuration
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP_OR_DOMAIN
API_SECRET_KEY=your-api-secret-key-here

# JWT Configuration (If using JWT)
JWT_SECRET=your-jwt-secret-key-here

# Email Configuration (If using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-app-password

# AWS Configuration (If using AWS services)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Payment Gateway (If using Stripe/Razorpay etc)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Other Public Variables (accessible in browser)
NEXT_PUBLIC_APP_NAME=ERP Application
NEXT_PUBLIC_APP_VERSION=1.0.0

# ==============================================================================
# ADD ANY OTHER ENVIRONMENT VARIABLES YOUR APP NEEDS
# ==============================================================================

ENV_FILE

# Set proper permissions
chown ubuntu:ubuntu /var/www/nextjs-app/.env.production
chmod 600 /var/www/nextjs-app/.env.production

echo "✅ Environment file created at /var/www/nextjs-app/.env.production"
echo "⚠️  IMPORTANT: Update this file with your actual values after deployment!"

# ============================================================================
# CONFIGURE NGINX
# ============================================================================
echo "[7/8] Configuring Nginx..."

cat > /etc/nginx/sites-available/nextjs-app << 'NGINX_CONFIG'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/nextjs-access.log;
    error_log /var/log/nginx/nextjs-error.log;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Real IP forwarding
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
    
    # Static files caching (if served by Nginx)
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }
    
    # Client max body size (for file uploads)
    client_max_body_size 10M;
}
NGINX_CONFIG

# Enable site and remove default
ln -sf /etc/nginx/sites-available/nextjs-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t && systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configured and started"

# ============================================================================
# SETUP PM2
# ============================================================================
echo "[8/8] Configuring PM2..."

# Create PM2 ecosystem file
cat > /var/www/nextjs-app/ecosystem.config.js << 'PM2_CONFIG'
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
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
  }]
}
PM2_CONFIG

chown ubuntu:ubuntu /var/www/nextjs-app/ecosystem.config.js

# Setup PM2 startup script (runs PM2 on system boot)
sudo -u ubuntu bash << 'UBUNTU_SETUP'
cd /home/ubuntu
pm2 startup systemd -u ubuntu --hp /home/ubuntu
UBUNTU_SETUP

# Generate the startup script
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "✅ PM2 configured to start on boot"

# ============================================================================
# CREATE DEPLOYMENT HELPER SCRIPT
# ============================================================================
cat > /home/ubuntu/update-env.sh << 'UPDATE_SCRIPT'
#!/bin/bash
# Helper script to update environment variables

echo "Opening environment file for editing..."
echo "After editing, restart the app with: pm2 restart nextjs-app"
sudo nano /var/www/nextjs-app/.env.production
UPDATE_SCRIPT

chmod +x /home/ubuntu/update-env.sh
chown ubuntu:ubuntu /home/ubuntu/update-env.sh

# ============================================================================
# FINAL STATUS
# ============================================================================
echo ""
echo "=========================================="
echo "✅ EC2 BOOTSTRAP COMPLETED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "📋 What was installed:"
echo "  - Node.js $(node --version)"
echo "  - npm $(npm --version)"
echo "  - PM2 $(pm2 --version)"
echo "  - Nginx $(nginx -v 2>&1 | grep -o 'nginx/[0-9.]*')"
echo ""
echo "📁 Application directory: /var/www/nextjs-app"
echo "📝 Environment file: /var/www/nextjs-app/.env.production"
echo "📊 Logs directory: /var/www/nextjs-app/logs"
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Update environment variables in GitHub Secrets"
echo "  2. Push code to trigger GitHub Actions deployment"
echo "  3. Access your app at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 To manually update env vars:"
echo "  SSH into EC2 and run: ./update-env.sh"
echo ""
echo "=========================================="

# Save instance metadata for reference
curl -s http://169.254.169.254/latest/meta-data/public-ipv4 > /home/ubuntu/public-ip.txt
curl -s http://169.254.169.254/latest/meta-data/instance-id > /home/ubuntu/instance-id.txt
chown ubuntu:ubuntu /home/ubuntu/*.txt

# Bootstrap complete
exit 0
