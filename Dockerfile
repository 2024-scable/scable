# Base image
FROM ubuntu:22.04

# Install necessary packages
RUN apt-get update && apt-get install -y \
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
    python3-gi-cairo \
    meson && \
    apt-get clean

# Install Jenkins
RUN echo -e "\033[32m[+] Starting Jenkins installation\033[0m" && \
    wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key && \
    echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | tee /etc/apt/sources.list.d/jenkins.list > /dev/null && \
    apt-get update && \
    apt-get install -y jenkins && \
    echo -e "\033[32m[+] Jenkins installation complete\033[0m"

# Install global npm packages
RUN npm install -g \
    @cyclonedx/cdxgen@10.11.0 \
    vite@5.4.11 \
    corepack@0.29.4

# Upgrade Node.js to v23.1.0
RUN echo -e "\033[32m[+] Upgrading Node.js to v23.1.0\033[0m" && \
    curl -fsSL https://nodejs.org/dist/v23.1.0/node-v23.1.0-linux-x64.tar.xz -o node-v23.1.0-linux-x64.tar.xz && \
    tar -xf node-v23.1.0-linux-x64.tar.xz && \
    mv node-v23.1.0-linux-x64 /usr/local/nodejs && \
    rm -rf node-v23.1.0-linux-x64.tar.xz && \
    ln -sf /usr/local/nodejs/bin/node /usr/bin/node && \
    ln -sf /usr/local/nodejs/bin/npm /usr/bin/npm && \
    ln -sf /usr/local/nodejs/bin/npx /usr/bin/npx && \
    echo -e "\033[32m[+] Node.js upgrade complete\033[0m"

# Set working directory
WORKDIR /home/scable

# Copy project repository from local machine
COPY . /home/scable

# Install Python dependencies
RUN pip3 install --upgrade pip && \
    pip3 install -r requirements.txt

# Install gdown and download required files
RUN pip3 install gdown && \
    gdown --folder https://drive.google.com/drive/folders/1-n8bRS2iFET-zYENnC8g6QIvVggQuyO8 && \
    mkdir -p /home/scable/nvd_database && \
    mv database/cve_cvss3_data.csv /home/scable/nvd_database/ && \
    mv database/top_10000_npm_packages.xlsx \
       database/top_200_maven_packages.xlsx \
       database/top_400_github_projects.xlsx \
       database/top_8000_pypi_packages.xlsx \
       /home/scable/script/package-check/ && \
    rm -rf /home/scable/database

# Install and configure CodeQL
RUN echo -e "\033[32m[+] Starting CodeQL installation and setup\033[0m" && \
    mkdir -p /home/scable/codeql && \
    cd /home/scable/codeql && \
    git clone https://github.com/github/codeql codeql-repo && \
    echo -e "\033[32m[+] CodeQL repo download complete\033[0m" && \
    wget https://github.com/github/codeql-cli-binaries/releases/download/v2.19.3/codeql-linux64.zip && \
    unzip codeql-linux64.zip && \
    mv codeql codeql-cli && \
    rm -rf codeql-linux64.zip && \
    mv codeql-repo /home/scable/ && \
    mv codeql-cli /home/scable/ && \
    echo 'export PATH=$PATH:/home/scable/codeql-cli/' >> /etc/profile.d/codeql.sh && \
    chmod +x /etc/profile.d/codeql.sh && \
    echo -e "\033[32m[+] CodeQL Install & Setting complete\033[0m"

# Move SCABLE.QL to the correct directory
RUN mkdir -p /home/scable/codeql-repo/python/ql/src/Security/scable/ && \
    mv /home/scable/scable.ql /home/scable/codeql-repo/python/ql/src/Security/scable/ && \
    rm -rf /home/scable/scable

# Install project-specific npm dependencies
WORKDIR /home/scable/result-html
RUN npm install

# Return to the main working directory
WORKDIR /home/scable

# Apply environment variables
ENV PATH="/home/scable/codeql-cli/:${PATH}"

# Default command: Start Jenkins and run main.py
CMD ["bash"]
