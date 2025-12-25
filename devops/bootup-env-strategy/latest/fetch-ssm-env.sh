#!/bin/bash
# ============================================================================
# SSM Parameter Store to .env Generator
# Fetches ALL parameters from specified SSM path and creates .env file
# ============================================================================

set -e

# ============================================================================
# Configuration
# ============================================================================
SSM_PATH="${SSM_PATH:-/mpencil-app/test}"
ENV_FILE="${ENV_FILE:-/var/www/nextjs-app/.env.production}"
REGION="${AWS_REGION:-$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo 'us-east-1')}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Functions
# ============================================================================

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

check_dependencies() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq not installed, installing..."
        if command -v dnf &> /dev/null; then
            sudo dnf install -y jq
        elif command -v yum &> /dev/null; then
            sudo yum install -y jq
        elif command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y jq
        else
            log_error "Cannot install jq"
            exit 1
        fi
    fi
}

# ============================================================================
# Main
# ============================================================================

echo ""
log_info "=========================================="
log_info "SSM Parameter Fetcher"
log_info "=========================================="
echo ""
log_info "Configuration:"
log_info "  SSM Path: ${SSM_PATH}"
log_info "  Target File: ${ENV_FILE}"
log_info "  Region: ${REGION}"
echo ""

check_dependencies

# Backup existing file
if [ -f "$ENV_FILE" ]; then
    BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "Backing up to: ${BACKUP_FILE}"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# Fetch parameters
log_info "Fetching parameters from: ${SSM_PATH}"

PARAMETERS=$(aws ssm get-parameters-by-path \
    --path "$SSM_PATH" \
    --with-decryption \
    --recursive \
    --region "$REGION" \
    --output json 2>/dev/null)

PARAM_COUNT=$(echo "$PARAMETERS" | jq '.Parameters | length')

if [ "$PARAM_COUNT" -eq 0 ]; then
    log_error "No parameters found at: ${SSM_PATH}"
    log_error "Check:"
    log_error "  1. SSM path exists"
    log_error "  2. IAM role has ssm:GetParametersByPath"
    log_error "  3. Region is correct: ${REGION}"
    exit 1
fi

log_success "Found ${PARAM_COUNT} parameter(s)"

# Create temp file
TEMP_FILE=$(mktemp)

# Write header
cat > "$TEMP_FILE" << EOF
# ============================================================================
# Environment Configuration
# Auto-generated from AWS SSM Parameter Store
# 
# SSM Path: ${SSM_PATH}
# Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')
# ============================================================================

NODE_ENV=production
PORT=3000

EOF

# Process parameters
log_info "Processing parameters..."
echo ""

echo "$PARAMETERS" | jq -r '.Parameters[] | "\(.Name)=\(.Value)"' | while IFS= read -r line; do
    FULL_NAME=$(echo "$line" | cut -d'=' -f1)
    PARAM_VALUE=$(echo "$line" | cut -d'=' -f2-)
    
    # Convert path to env name
    # /mpencil-app/test/MONGODB_URI -> MONGODB_URI
    ENV_NAME=$(echo "$FULL_NAME" | sed "s|^${SSM_PATH}/||" | sed "s|^/||")
    
    # Handle special characters in values
    if [[ "$PARAM_VALUE" =~ [[:space:]] ]] || [[ "$PARAM_VALUE" =~ [\$\`\"] ]]; then
        PARAM_VALUE=$(echo "$PARAM_VALUE" | sed 's/"/\\"/g')
        echo "${ENV_NAME}=\"${PARAM_VALUE}\"" >> "$TEMP_FILE"
    else
        echo "${ENV_NAME}=${PARAM_VALUE}" >> "$TEMP_FILE"
    fi
    
    log_success "  ✓ ${ENV_NAME}"
done

# Footer
cat >> "$TEMP_FILE" << EOF

# ============================================================================
# End of configuration
# ============================================================================
EOF

# Move to final location
mv "$TEMP_FILE" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Set ownership
if [ "$EUID" -eq 0 ] && id -u ec2-user &>/dev/null; then
    chown ec2-user:ec2-user "$ENV_FILE"
fi

echo ""
log_success "=========================================="
log_success "Environment file created!"
log_success "=========================================="
echo ""
log_info "Location: ${ENV_FILE}"
log_info "Parameters: ${PARAM_COUNT}"
echo ""

# Show structure (hide values)
log_info "Generated variables:"
echo ""
grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/=.*/=***/' | while read -r line; do
    echo "  $line"
done

echo ""
log_success "✅ Done!"
echo ""

exit 0
