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
    src/angular/.angular-cli.json \
    /app/

RUN ls -l /app/

# ng src needs to be mounted on /app/src
WORKDIR /app/src

CMD ["/app/node_modules/@angular/cli/bin/ng", "test", \
     "--browsers", "ChromeHeadless", \
     "--single-run"]
