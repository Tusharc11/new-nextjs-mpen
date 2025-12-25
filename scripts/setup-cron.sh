#!/bin/bash

# Setup script for late fee processing cron job
# This script will run daily at 12:00 AM (midnight) to process overdue fees

# Configuration
API_URL="http://localhost:3000/api/cron/process-late-fees"
CRON_SECRET="mayank"

# Function to add cron job
setup_cron() {
    echo "Setting up cron job for late fee processing..."
    
    # Create a temporary cron file
    CRON_FILE="/tmp/late-fees-cron"
    
    # Add the cron job (runs daily at midnight)
    echo "0 0 * * * /usr/bin/curl -X POST -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json' $API_URL >> /var/log/late-fees-cron.log 2>&1" > $CRON_FILE
    
    # Install the cron job
    crontab $CRON_FILE
    
    # Clean up
    rm $CRON_FILE
    
    echo "✅ Cron job installed successfully!"
    echo "The late fee processing will run daily at midnight (00:00)"
    echo "Logs will be saved to /var/log/late-fees-cron.log"
}

# Function to remove cron job
remove_cron() {
    echo "Removing late fee processing cron job..."
    
    # Remove the specific cron job
    crontab -l | grep -v "process-late-fees" | crontab -
    
    echo "✅ Cron job removed successfully!"
}

# Function to show current cron jobs
show_cron() {
    echo "Current cron jobs:"
    crontab -l
}

# Main script
case "$1" in
    "install")
        setup_cron
        ;;
    "remove")
        remove_cron
        ;;
    "show")
        show_cron
        ;;
    *)
        echo "Usage: $0 {install|remove|show}"
        echo ""
        echo "Commands:"
        echo "  install  - Install the late fee processing cron job"
        echo "  remove   - Remove the late fee processing cron job"
        echo "  show     - Show current cron jobs"
        echo ""
        echo "Before running 'install', make sure to:"
        echo "1. Update the API_URL in this script to match your domain"
        echo "2. Set a secure CRON_SECRET in your environment variables"
        echo "3. Make sure your Next.js application is running"
        exit 1
        ;;
esac 