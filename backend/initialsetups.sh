cat << 'EOF' > setup.sh
#!/bin/bash
set -e

echo "=================================================="
echo "Starting MalluMatch EC2 Setup Script..."
echo "=================================================="

# 1. Update system packages
echo "Updating apt repositories..."
sudo apt update -y

# 2. Install curl, git, and other tools
echo "Installing prerequisites (curl, git, build tools)..."
sudo apt install -y curl git build-essential

# 3. Install Node.js 20 from NodeSource
echo "Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js and NPM installation
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PM2 globally
echo "Installing PM2 globally..."
sudo npm install -g pm2

# 5. Clone the repository
REPO_URL="https://github.com/abhinandnm/MalluMatch-re.git"
CLONE_DIR="MalluMatch-re"

if [ -d "$CLONE_DIR" ]; then
    echo "Directory $CLONE_DIR already exists. Pulling latest changes instead of cloning..."
    cd "$CLONE_DIR"
    git pull
else
    echo "Cloning repository: $REPO_URL..."
    git clone "$REPO_URL" "$CLONE_DIR"
    cd "$CLONE_DIR"
fi

# 6. Install dependencies
echo "Installing backend node modules..."
cd backend
npm install

# 7. Create placeholder .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating default .env file..."
    cat <<EOT >> .env
