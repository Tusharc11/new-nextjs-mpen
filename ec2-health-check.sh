#!/bin/bash

##############################################################################
# EC2 Next.js Application Health Check & Troubleshooting Script
# Usage: ./ec2-health-check.sh
##############################################################################

set -e

APP_DIR="/var/www/nextjs-app"
APP_NAME="nextjs-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

##############################################################################
# 1. SYSTEM INFORMATION
##############################################################################

print_header "1. SYSTEM INFORMATION"

log_info "Hostname: $(hostname)"
log_info "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
log_info "Kernel: $(uname -r)"
log_info "Uptime: $(uptime -p)"
log_info "Current User: $(whoami)"
log_info "Current Time: $(date)"

##############################################################################
# 2. RESOURCE USAGE
##############################################################################

print_header "2. SYSTEM RESOURCES"

echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "  CPU Usage: " 100 - $1"%"}'

echo ""
echo "Memory Usage:"
free -h | awk 'NR==2{printf "  Total: %s\n  Used: %s (%.2f%%)\n  Free: %s\n", $2, $3, $3*100/$2, $4}'

echo ""
echo "Disk Usage:"
df -h / | awk 'NR==2{printf "  Total: %s\n  Used: %s (%s)\n  Available: %s\n", $2, $3, $5, $4}'

echo ""
log_info "Disk usage of app directory:"
du -sh $APP_DIR 2>/dev/null || log_warning "App directory not found"

##############################################################################
# 3. NODE & NPM VERSIONS
##############################################################################

print_header "3. NODE.JS ENVIRONMENT"

if command -v node &> /dev/null; then
    log_success "Node.js installed: $(node --version)"
else
    log_error "Node.js NOT installed!"
fi

if command -v npm &> /dev/null; then
    log_success "NPM installed: $(npm --version)"
else
    log_error "NPM NOT installed!"
fi

if command -v pm2 &> /dev/null; then
    log_success "PM2 installed: $(pm2 --version)"
else
    log_error "PM2 NOT installed!"
fi

##############################################################################
# 4. PM2 STATUS
##############################################################################

print_header "4. PM2 PROCESS STATUS"

if command -v pm2 &> /dev/null; then
    pm2 list
    
    echo ""
    if pm2 describe $APP_NAME &> /dev/null; then
        log_success "Application '$APP_NAME' found in PM2"
        echo ""
        pm2 info $APP_NAME
        
        # Check if online
        if pm2 describe $APP_NAME | grep -q "online"; then
            log_success "Application status: ONLINE"
        else
            log_error "Application status: NOT ONLINE"
        fi
    else
        log_error "Application '$APP_NAME' NOT found in PM2"
    fi
else
    log_error "PM2 not installed"
fi

##############################################################################
# 5. APPLICATION DIRECTORY CHECK
##############################################################################

print_header "5. APPLICATION DIRECTORY"

if [ -d "$APP_DIR" ]; then
    log_success "App directory exists: $APP_DIR"
    echo ""
    log_info "Directory contents:"
    ls -lah $APP_DIR/
    
    if [ -d "$APP_DIR/current" ]; then
        log_success "Current deployment exists"
        echo ""
        log_info "Current deployment contents:"
        ls -lah $APP_DIR/current/
        
        # Check for key files
        echo ""
        log_info "Checking critical files..."
        
        [ -f "$APP_DIR/current/package.json" ] && log_success "package.json found" || log_error "package.json MISSING"
        [ -d "$APP_DIR/current/.next" ] && log_success ".next directory found" || log_error ".next directory MISSING"
        [ -d "$APP_DIR/current/node_modules" ] && log_success "node_modules found" || log_error "node_modules MISSING"
        [ -f "$APP_DIR/current/.env.production" ] && log_success ".env.production found" || log_warning ".env.production MISSING"
        
        # Check .next contents
        if [ -d "$APP_DIR/current/.next" ]; then
            echo ""
            log_info ".next directory contents:"
            ls -lah $APP_DIR/current/.next/
            
            if [ -f "$APP_DIR/current/.next/BUILD_ID" ]; then
                log_success "Build ID: $(cat $APP_DIR/current/.next/BUILD_ID)"
            fi
        fi
        
        # Check deployment info
        if [ -f "$APP_DIR/current/DEPLOYMENT_INFO.json" ]; then
            echo ""
            log_success "Deployment info found:"
            cat $APP_DIR/current/DEPLOYMENT_INFO.json
        else
            log_warning "No deployment info file found"
        fi
    else
        log_error "Current deployment directory NOT found"
    fi
    
    # List backups
    echo ""
    log_info "Available backups:"
    ls -dt $APP_DIR/backup-* 2>/dev/null | head -5 || log_warning "No backups found"
    
else
    log_error "App directory does NOT exist: $APP_DIR"
fi

##############################################################################
# 6. NETWORK & PORT CHECK
##############################################################################

print_header "6. NETWORK & PORTS"

# Get port from PM2 or default to 3000
if pm2 describe $APP_NAME &> /dev/null; then
    PORT=$(pm2 describe $APP_NAME | grep -oP '(?<=PORT: )\d+' || echo "3000")
else
    PORT="3000"
fi

log_info "Expected application port: $PORT"

echo ""
log_info "Listening ports:"
netstat -tulpn 2>/dev/null | grep LISTEN || ss -tulpn | grep LISTEN

echo ""
if netstat -tulpn 2>/dev/null | grep -q ":$PORT" || ss -tulpn | grep -q ":$PORT"; then
    log_success "Application is listening on port $PORT"
else
    log_error "Application NOT listening on port $PORT"
fi

##############################################################################
# 7. HTTP HEALTH CHECK
##############################################################################

print_header "7. HTTP HEALTH CHECK"

log_info "Testing HTTP response on localhost:$PORT..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    log_success "HTTP response: $HTTP_CODE (OK)"
else
    log_error "HTTP response: $HTTP_CODE (FAILED)"
fi

echo ""
log_info "Response headers:"
curl -I http://localhost:$PORT/ 2>/dev/null | head -10 || log_error "Failed to get headers"

##############################################################################
# 8. APPLICATION LOGS
##############################################################################

print_header "8. APPLICATION LOGS (Last 30 lines)"

if command -v pm2 &> /dev/null; then
    if pm2 describe $APP_NAME &> /dev/null; then
        echo "=== OUTPUT LOGS ==="
        pm2 logs $APP_NAME --out --lines 30 --nostream
        
        echo ""
        echo "=== ERROR LOGS ==="
        pm2 logs $APP_NAME --err --lines 30 --nostream
    else
        log_error "No PM2 process to show logs for"
    fi
fi

##############################################################################
# 9. ENVIRONMENT VARIABLES
##############################################################################

print_header "9. ENVIRONMENT VARIABLES"

if [ -f "$APP_DIR/current/.env.production" ]; then
    log_success ".env.production exists"
    log_info "Number of variables: $(grep -c '=' $APP_DIR/current/.env.production 2>/dev/null || echo '0')"
    log_info "File size: $(wc -c < $APP_DIR/current/.env.production) bytes"
    
    echo ""
    log_info "Variable names (values hidden for security):"
    grep -E '^[A-Z_]+=.' $APP_DIR/current/.env.production | cut -d'=' -f1 | sed 's/^/  /'
else
    log_error ".env.production NOT found"
fi

##############################################################################
# 10. NGINX/REVERSE PROXY CHECK (if applicable)
##############################################################################

print_header "10. REVERSE PROXY CHECK"

if command -v nginx &> /dev/null; then
    log_info "NGINX installed: $(nginx -v 2>&1)"
    
    echo ""
    log_info "NGINX status:"
    systemctl status nginx --no-pager | head -15
    
    echo ""
    log_info "NGINX configuration test:"
    nginx -t
else
    log_warning "NGINX not installed (may not be needed)"
fi

##############################################################################
# 11. SSL/CERTIFICATES CHECK (if applicable)
##############################################################################

print_header "11. SSL CERTIFICATES"

if [ -d "/etc/letsencrypt/live" ]; then
    log_info "Let's Encrypt certificates found:"
    ls -lah /etc/letsencrypt/live/
else
    log_warning "No Let's Encrypt certificates found"
fi

##############################################################################
# 12. QUICK DIAGNOSTICS
##############################################################################

print_header "12. QUICK DIAGNOSTICS"

ISSUES=0

# Check if PM2 process is running
if ! pm2 describe $APP_NAME &> /dev/null; then
    log_error "Issue: PM2 process not found"
    ((ISSUES++))
elif ! pm2 describe $APP_NAME | grep -q "online"; then
    log_error "Issue: PM2 process not online"
    ((ISSUES++))
fi

# Check if .next exists
if [ ! -d "$APP_DIR/current/.next" ]; then
    log_error "Issue: .next directory missing (build artifacts)"
    ((ISSUES++))
fi

# Check if node_modules exists
if [ ! -d "$APP_DIR/current/node_modules" ]; then
    log_error "Issue: node_modules missing"
    ((ISSUES++))
fi

# Check if port is listening
if ! netstat -tulpn 2>/dev/null | grep -q ":$PORT" && ! ss -tulpn | grep -q ":$PORT"; then
    log_error "Issue: Application not listening on port $PORT"
    ((ISSUES++))
fi

# Check HTTP response
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "304" ]; then
    log_error "Issue: HTTP health check failed (code: $HTTP_CODE)"
    ((ISSUES++))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    log_success "✅ No critical issues detected!"
else
    log_error "❌ Found $ISSUES critical issue(s) - see above for details"
fi

##############################################################################
# 13. RECOMMENDED ACTIONS
##############################################################################

print_header "13. RECOMMENDED ACTIONS"

if [ $ISSUES -gt 0 ]; then
    echo "Based on the issues found, try these actions:"
    echo ""
    echo "1. Restart application:"
    echo "   pm2 restart $APP_NAME"
    echo ""
    echo "2. Check recent PM2 logs:"
    echo "   pm2 logs $APP_NAME --lines 100"
    echo ""
    echo "3. Manually start if stopped:"
    echo "   cd $APP_DIR && pm2 start ecosystem.config.js"
    echo ""
    echo "4. Rebuild node_modules if missing:"
    echo "   cd $APP_DIR/current && npm ci --omit=dev"
    echo ""
    echo "5. Check if .env.production has all required variables:"
    echo "   cat $APP_DIR/current/.env.production"
    echo ""
    echo "6. View full PM2 process info:"
    echo "   pm2 info $APP_NAME"
    echo ""
    echo "7. Test app directly:"
    echo "   cd $APP_DIR/current && PORT=$PORT npm start"
else
    echo "Application appears healthy! Here are monitoring commands:"
    echo ""
    echo "• Real-time logs:     pm2 logs $APP_NAME"
    echo "• Process monitor:    pm2 monit"
    echo "• Detailed status:    pm2 info $APP_NAME"
    echo "• Restart app:        pm2 restart $APP_NAME"
    echo "• Reload app:         pm2 reload $APP_NAME"
fi

print_header "HEALTH CHECK COMPLETE"
