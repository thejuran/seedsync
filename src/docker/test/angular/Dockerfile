# Use Node 18 - required for node-sass@9.0.0 and other dependencies
FROM node:18-slim AS seedsync_test_angular

# Install Chrome and build dependencies for node-gyp
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates python3 make g++ && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Set Chrome binary path for Karma
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Node 18 OpenSSL 3.0 compatibility for Angular CLI 1.3.2
ENV NODE_OPTIONS=--openssl-legacy-provider

# Install npm dependencies
COPY src/angular/package*.json /app/
WORKDIR /app
RUN npm install --legacy-peer-deps

COPY \
    src/angular/tsconfig.json \
    src/angular/karma.conf.js \
    src/angular/.angular-cli.json \
    /app/

# ng src needs to be mounted on /app/src
WORKDIR /app/src

CMD ["/app/node_modules/@angular/cli/bin/ng", "test", \
     "--browsers", "ChromeHeadless", \
     "--single-run"]
