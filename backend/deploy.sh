#!/bin/bash

# Configuration
# By default, we'll assume the app is in /home/ubuntu/MalluMatch-re/backend
APP_DIR="$HOME/MalluMatch-re/backend"

echo "Starting deployment..."

# Navigate to app directory
if [ ! -d "$APP_DIR" ]; then
    echo "Directory $APP_DIR not found. Please ensure the repo is cloned there."
    exit 1
fi

cd $APP_DIR

# Pull latest changes
git fetch origin main
git reset --hard origin/main

# Install dependencies
npm install --production

# Restart application with PM2
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

echo "Deployment finished successfully!"
