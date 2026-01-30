# SeedSync

SeedSync is a file syncing tool that syncs files from a remote Linux server (like a seedbox) to a local machine using LFTP for fast transfers. It features a web UI for tracking and controlling transfers.

## Technology Stack

- **Frontend**: Angular 19.x with TypeScript 5.7
- **Backend**: Python 3.11+ with Bottle web framework
- **Build System**: Docker/Docker Buildx for builds, Make for orchestration
- **Package Manager**: Poetry (Python), npm (Angular)
- **Testing**: pytest (Python), Karma/Jasmine (Angular unit tests), Playwright (E2E)
- **Linting**: ESLint 9.x with typescript-eslint (flat config format)
- **CSS Framework**: Bootstrap 5.3 with Popper.js

## Project Structure

```
src/
├── angular/          # Angular frontend application
│   ├── src/          # Source files
│   └── e2e/          # Angular e2e tests (Playwright)
├── python/           # Python backend application
│   ├── controller/   # Business logic controllers
│   │   ├── controller.py      # Main controller (orchestration)
│   │   ├── scan_manager.py    # Scanner process management
│   │   ├── lftp_manager.py    # LFTP process management
│   │   ├── file_operation_manager.py  # Extract/delete operations
│   │   ├── model_builder.py   # Model construction from scan data
│   │   └── scan/              # Scanner implementations
│   ├── model/        # Data models (ModelFile, etc.)
│   ├── common/       # Shared utilities
│   │   └── bounded_ordered_set.py  # LRU-evicting bounded set
│   ├── web/          # Web server (Bottle)
│   ├── lftp/         # LFTP integration
│   ├── ssh/          # SSH handling
│   ├── tests/        # Python unit tests
│   └── seedsync.py   # Main entry point
├── docker/           # Docker build and test configurations
├── e2e/              # End-to-end tests (Playwright)
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

## Architecture Overview

### Backend Manager Pattern

The Controller delegates to specialized managers for separation of concerns:

- **ScanManager** (`scan_manager.py`): Manages scanner processes (Active, Local, Remote)
- **LftpManager** (`lftp_manager.py`): Manages LFTP process for downloads (queue, kill, status)
- **FileOperationManager** (`file_operation_manager.py`): Manages extract and delete operations

### Thread Safety Patterns

The codebase uses consistent thread-safety patterns:

1. **Copy-under-lock for listeners**: Listener collections are copied while holding a lock, then iterated outside the lock to prevent modification during iteration.

2. **Freeze-on-add immutability**: `ModelFile` objects become immutable after being added to the Model. This eliminates the need for deep copying on API requests.

3. **Bounded collections with LRU eviction**: `BoundedOrderedSet` provides set semantics with automatic eviction of oldest entries when the limit is reached.

### API Response Codes

The API uses proper HTTP status codes:
- `400 Bad Request`: Validation errors
- `404 Not Found`: File/resource doesn't exist
- `409 Conflict`: Resource in wrong state for operation
- `500 Internal Server Error`: Backend errors (LFTP failures)

## Key Files

- `src/python/seedsync.py` - Main Python entry point
- `src/python/controller/controller.py` - Main controller (orchestration)
- `src/python/controller/scan_manager.py` - Scanner process management
- `src/python/controller/lftp_manager.py` - LFTP process management
- `src/python/controller/file_operation_manager.py` - Extract/delete operations
- `src/python/controller/model_builder.py` - Model construction logic
- `src/angular/package.json` - Angular version and dependencies (current: 0.8.6)
- `src/python/pyproject.toml` - Python dependencies (Poetry)
- `src/debian/changelog` - Version changelog for deb package
- `Makefile` - All build and test commands
- `.github/workflows/master.yml` - CI pipeline
- `src/angular/eslint.config.js` - ESLint configuration (flat config)
- `src/angular/playwright.config.ts` - Angular e2e Playwright config
- `src/e2e/playwright.config.ts` - Main e2e Playwright config

## Configuration

### Controller Config Options

Key configuration options in the `[Controller]` section:
- `max_tracked_files` - Maximum files to track in downloaded/extracted sets (default: 10000)

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

## Recent Modernization (January 2026)

The codebase underwent significant modernization:

1. **Frontend**: Upgraded from Angular 4.x to Angular 19.x, Bootstrap 4 to 5
2. **Thread Safety**: Added synchronization to all listener collections
3. **Performance**: Replaced deep copy with freeze-on-add immutability pattern
4. **Memory Management**: Added bounded collections with LRU eviction
5. **Code Quality**: Refactored large methods (build_model, __update_model)
6. **Architecture**: Extracted ScanManager, LftpManager, FileOperationManager from Controller
7. **API**: Standardized HTTP status codes for error responses

See `MODERNIZATION_ACTION_PLAN.md` and `MODERNIZATION_REPORT.md` for details.
