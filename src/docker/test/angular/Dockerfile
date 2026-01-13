# Use Node 14 for Karma 2.0.5 compatibility
# Node 14 predates the inspect method changes that cause serialization issues
FROM node:14-bullseye-slim AS seedsync_test_angular

# Install Chrome for headless testing via Google's apt repository
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Set Chrome binary path for Karma
ENV CHROME_BIN=/usr/bin/google-chrome-stable

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
