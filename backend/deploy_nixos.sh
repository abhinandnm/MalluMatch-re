#!/usr/bin/env nix-shell
#!nix-shell -i bash -p git nodejs pm2

# Configuration
REPO_DIR="$HOME/MalluMatch-re"
BACKEND_DIR="$REPO_DIR/backend"
FRONTEND_DIR="$REPO_DIR/frontend"

echo "Starting NixOS deployment..."

# Safely navigate to repo directory
if [ ! -d "$REPO_DIR" ]; then
    echo "Directory $REPO_DIR not found. Please ensure the repo is cloned there."
    exit 1
fi

cd "$REPO_DIR" || exit

# Pull latest changes
echo "Pulling latest changes..."
git fetch origin main
git reset --hard origin/main

# Build frontend
echo "Building Frontend..."
cd "$FRONTEND_DIR" || exit
npm install --legacy-peer-deps
npm run build

# Restart Backend
echo "Restarting Backend..."
cd "$BACKEND_DIR" || exit
npm install --production
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

# Save PM2 state
pm2 save

echo "Deployment finished successfully!"
