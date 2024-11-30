#!/bin/bash

# Set working directory
WORKDIR="/home/scable"

set -e

echo -e "\033[32m[+] Updating and installing required packages...\033[0m"

# Update and install packages
apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    python2 \
    python2-dev \
    openjdk-17-jdk \
    nodejs \
    npm \
    git \
    curl \
    wget \
    jq \
    unzip \
    zip \
    vim \
    fonts-dejavu-core \
    libfreetype6 \
    libfontconfig1 \
    libjpeg-turbo8 \
    libpng16-16 \
    libx11-6 \
    libxrender1 \
    libxext6 \
    libssl3 \
    sqlite3 \
    pkg-config \
    libcairo2-dev \
    libgirepository1.0-dev \
    gir1.2-gtk-3.0 \
    python3-gi \
    libdbus-1-dev \
    pkg-config \
    libglib2.0-dev \
    meson

# Clean up cached files to save space
echo -e "\033[32m[+] Cleaning up...\033[0m"
apt-get clean
rm -rf /var/lib/apt/lists/*

# Install Jenkins
echo -e "\033[32m[+] Installing Jenkins\033[0m"
wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | tee /etc/apt/sources.list.d/jenkins.list
apt-get update && apt-get install -y jenkins

# Install global npm packages

echo -e "\033[32m[+] Installing global npm packages\033[0m"
npm install -g \
    @cyclonedx/cdxgen@10.11.0 \
    vite@5.4.11 \
    corepack@0.29.4

# Upgrade Node.js to v23.1.0
echo -e "\033[32m[+] Upgrading Node.js to v23.1.0\033[0m"
curl -fsSL https://nodejs.org/dist/v23.1.0/node-v23.1.0-linux-x64.tar.xz -o node-v23.1.0-linux-x64.tar.xz
tar -xf node-v23.1.0-linux-x64.tar.xz
mv node-v23.1.0-linux-x64 /usr/local/nodejs
rm -rf node-v23.1.0-linux-x64.tar.xz
ln -sf /usr/local/nodejs/bin/node /usr/bin/node
ln -sf /usr/local/nodejs/bin/npm /usr/bin/npm
ln -sf /usr/local/nodejs/bin/npx /usr/bin/npx

# Clone project repository
echo -e "\033[32m[+] Cloning SCABLE project repository\033[0m"
mkdir -p "$WORKDIR"
cd "$WORKDIR"
git clone https://github.com/2024-scable/scable .

# Set permissions for SCABLE directory
echo -e "\033[32m[+] Setting permissions for SCABLE directory\033[0m"
chmod -R 755 "$WORKDIR"
chown -R $(whoami):$(whoami) "$WORKDIR"

# Install Python dependencies
echo -e "\033[32m[+] Installing Python dependencies\033[0m"
pip3 install --upgrade pip
pip3 install -r requirements.txt

# Install gdown and download required files
echo -e "\033[32m[+] Downloading additional required files\033[0m"
pip3 install gdown
gdown --folder https://drive.google.com/drive/folders/1-n8bRS2iFET-zYENnC8g6QIvVggQuyO8
mkdir -p "$WORKDIR/nvd_database"
mv database/cve_cvss3_data.csv "$WORKDIR/nvd_database/" || echo -e "\033[31m[-] Failed to move cve_cvss3_data.csv.\033[0m"
mv database/*.xlsx "$WORKDIR/script/package-check/" || echo -e "\033[31m[-] Failed to move Excel files.\033[0m"
rm -rf "$WORKDIR/database"

# Install and configure CodeQL
echo -e "\033[32m[+] Installing and configuring CodeQL\033[0m"
mkdir -p "$WORKDIR/codeql"
cd "$WORKDIR/codeql"
git clone https://github.com/github/codeql codeql-repo
wget https://github.com/github/codeql-cli-binaries/releases/download/v2.19.3/codeql-linux64.zip
unzip codeql-linux64.zip
mv codeql codeql-cli
rm -rf codeql-linux64.zip
mv codeql-repo "$WORKDIR/"
mv codeql-cli "$WORKDIR/"
echo "export PATH=\$PATH:$WORKDIR/codeql-cli/" | tee -a ~/.bashrc
source ~/.bashrc

# Move SCABLE.QL to the correct directory
echo -e "\033[32m[+] Moving SCABLE.QL to the correct directory\033[0m"
mkdir -p "$WORKDIR/codeql-repo/python/ql/src/Security/scable/"
mv "$WORKDIR/scable.ql" "$WORKDIR/codeql-repo/python/ql/src/Security/scable/"
rm -rf "$WORKDIR/scable"

# Install project-specific npm dependencies
echo -e "\033[32m[+] Installing project-specific npm dependencies\033[0m"
cd "$WORKDIR/result-html"
npm install

# Set environment variables
export PATH="$WORKDIR/codeql-cli/:${PATH}"

# Start Jenkins and Python application
echo -e "\033[32m[+] Starting Jenkins and Python application\033[0m"
service jenkins start

# Set working directory for Python application
cd "$WORKDIR"
python3 main.py &

# Keep the script running
echo -e "\033[32m[+] Setup complete. SCABLE is running.\033[0m"
tail -f /dev/null
