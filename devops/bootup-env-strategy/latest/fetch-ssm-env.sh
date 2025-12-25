#!/bin/bash
set -e

SSM_PATH="/mpencil-app/test"
ENV_FILE="/var/www/nextjs-app/.env.production"
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

# Install jq if missing
command -v jq &> /dev/null || sudo dnf install -y jq

# Fetch parameters
PARAMETERS=$(aws ssm get-parameters-by-path \
    --path "$SSM_PATH" \
    --with-decryption \
    --recursive \
    --region "$REGION" \
    --output json)

# Create .env file
echo "NODE_ENV=production" > "$ENV_FILE"
echo "PORT=3000" >> "$ENV_FILE"

# Convert parameters to env format
echo "$PARAMETERS" | jq -r '.Parameters[] | "\(.Name)=\(.Value)"' | while IFS= read -r line; do
    FULL_NAME=$(echo "$line" | cut -d'=' -f1)
    VALUE=$(echo "$line" | cut -d'=' -f2-)
    ENV_NAME=$(echo "$FULL_NAME" | sed "s|^${SSM_PATH}/||")
    echo "${ENV_NAME}=${VALUE}" >> "$ENV_FILE"
done

chmod 600 "$ENV_FILE"
echo "✅ Environment file created at $ENV_FILE"
