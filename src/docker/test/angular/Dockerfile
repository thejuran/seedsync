FROM seedsync/build/angular/env AS seedsync_test_angular

# Install Chrome for headless testing
# node:20-slim doesn't include wget, so we need to install it first
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    wget -nv -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i /tmp/chrome.deb || apt-get -fy install

COPY \
    src/angular/tsconfig.json \
    src/angular/karma.conf.js \
    src/angular/angular.json \
    /app/

RUN ls -l /app/

# ng src needs to be mounted on /app/src
WORKDIR /app/src

# Use legacy OpenSSL provider for Node.js 17+ compatibility with old webpack
ENV NODE_OPTIONS=--openssl-legacy-provider

# Note: Angular 13+ CLI binary is ng.js
CMD ["node", "/app/node_modules/@angular/cli/bin/ng.js", "test", \
     "--browsers", "ChromeHeadless", \
     "--watch=false"]
