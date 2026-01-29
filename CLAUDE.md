# SeedSync

SeedSync is a file syncing tool that syncs files from a remote Linux server (like a seedbox) to a local machine using LFTP for fast transfers. It features a web UI for tracking and controlling transfers.

## Technology Stack

- **Frontend**: Angular 4.x with TypeScript
- **Backend**: Python 3.11+ with Bottle web framework
- **Build System**: Docker/Docker Buildx for builds, Make for orchestration
- **Package Manager**: Poetry (Python), npm (Angular)
- **Testing**: pytest (Python), Karma/Jasmine (Angular unit tests), Playwright (E2E)
- **Linting**: ESLint with @typescript-eslint

## Project Structure

```
src/
├── angular/          # Angular frontend application
│   ├── src/          # Source files
│   └── e2e/          # Angular e2e tests
├── python/           # Python backend application
│   ├── controller/   # Business logic controllers
│   ├── model/        # Data models
│   ├── web/          # Web server (Bottle)
│   ├── lftp/         # LFTP integration
│   ├── ssh/          # SSH handling
│   ├── tests/        # Python unit tests
│   └── seedsync.py   # Main entry point
├── docker/           # Docker build and test configurations
├── e2e/              # End-to-end tests
└── debian/           # Debian package configuration
```

## Build Commands

All builds run from the project root using Make and Docker:

```bash
# Build everything (deb package + docker image)
make

# Build only the deb package
make deb

# Build only the scanfs binary
make scanfs

# Build docker image (requires local registry at localhost:5000)
make docker-image

# Clean build artifacts
make clean
```

## Running Tests

```bash
# Python unit tests (Docker-based)
make run-tests-python

# Angular unit tests (Docker-based)
make run-tests-angular

# E2E tests for docker image
make run-tests-e2e STAGING_VERSION=latest SEEDSYNC_ARCH=amd64

# E2E tests for deb package
make run-tests-e2e SEEDSYNC_DEB=`readlink -f build/*.deb` SEEDSYNC_OS=ubu2004
```

### Manual Testing (without Docker)

```bash
# Python tests
cd src/python
poetry run pytest

# Angular unit tests
cd src/angular
node_modules/@angular/cli/bin/ng test

# Angular e2e tests (requires app running at localhost:4200)
cd src/angular
npm run e2e

# Main e2e tests (requires app running at configured baseURL)
cd src/e2e
npm test

# Linting
cd src/angular
npm run lint
```

## Development Setup

### Python Backend

```bash
cd src/python
poetry install
mkdir -p build/config
poetry run python seedsync.py -c build/config --html ../angular/dist --scanfs build/scanfs
```

### Angular Frontend

```bash
cd src/angular
npm install
node_modules/@angular/cli/bin/ng serve  # Serves at http://localhost:4200
```

### Remote Test Server

```bash
make run-remote-server  # Runs at localhost:1234
# Credentials: remoteuser/remotepass
# Remote path: /home/remoteuser/files
```

## Key Files

- `src/python/seedsync.py` - Main Python entry point
- `src/angular/package.json` - Angular version and dependencies (current: 0.8.6)
- `src/python/pyproject.toml` - Python dependencies (Poetry)
- `src/debian/changelog` - Version changelog for deb package
- `Makefile` - All build and test commands
- `.github/workflows/master.yml` - CI pipeline
- `src/angular/.eslintrc.json` - ESLint configuration
- `src/angular/playwright.config.ts` - Angular e2e Playwright config
- `src/e2e/playwright.config.ts` - Main e2e Playwright config

## Version Updates

When releasing, update version in these files:
1. `src/angular/package.json`
2. `src/debian/changelog`
3. `src/e2e/tests/about.page.spec.ts`
4. `src/angular/src/app/pages/main/about-page.component.html` (copyright year)

## Supported Platforms

- Linux (native deb package)
- Windows/macOS (via Docker)

Docker images are built for: `linux/amd64`

Note: ARM64 support (Raspberry Pi 3/4/5) temporarily disabled during Angular migration.
