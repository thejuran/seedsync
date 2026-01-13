FROM seedsync/build/angular/env AS seedsync_test_angular

# Install Chrome for headless testing via Google's apt repository
# This ensures all dependencies are properly resolved
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Set Chrome binary path for Karma
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Node.js 20 compatibility for Angular CLI 1.3.2 (uses older OpenSSL APIs)
ENV NODE_OPTIONS=--openssl-legacy-provider

COPY \
    src/angular/tsconfig.json \
    src/angular/karma.conf.js \
    src/angular/.angular-cli.json \
    /app/

RUN ls -l /app/

# ng src needs to be mounted on /app/src
WORKDIR /app/src

CMD ["/app/node_modules/@angular/cli/bin/ng", "test", \
     "--browsers", "ChromeHeadless", \
     "--single-run"]
