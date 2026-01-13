FROM seedsync/build/angular/env AS seedsync_test_angular

# Disable Angular CLI analytics prompt (blocks CI otherwise)
ENV NG_CLI_ANALYTICS=false

# Copy Angular configuration files
COPY \
    src/angular/tsconfig.json \
    src/angular/tsconfig.spec.json \
    src/angular/angular.json \
    /app/

RUN ls -l /app/

# ng src needs to be mounted on /app/src
WORKDIR /app

# Run tests using Angular CLI with Vitest (Angular 21's default test runner)
CMD ["npx", "ng", "test", "--no-watch"]
