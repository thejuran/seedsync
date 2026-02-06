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

# E2E tests for docker image (SEEDSYNC_ARCH: amd64 or arm64)
make run-tests-e2e STAGING_VERSION=latest SEEDSYNC_ARCH=amd64

# E2E tests for deb package (SEEDSYNC_OS: ubu2204 or ubu2404)
make run-tests-e2e SEEDSYNC_DEB=`readlink -f build/*.deb` SEEDSYNC_OS=ubu2204
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
- `src/angular/package.json` - Angular version and dependencies (current: 1.0.0)
- `src/python/pyproject.toml` - Python dependencies (Poetry)
- `src/debian/changelog` - Version changelog for deb package
- `Makefile` - All build and test commands
- `.github/workflows/master.yml` - CI pipeline (tests, E2E, release publish)
- `.github/workflows/docker-publish.yml` - Docker image publish (`:dev` on master, `:X.Y.Z` on tags)
- `src/angular/eslint.config.js` - ESLint configuration (flat config)
- `src/angular/playwright.config.ts` - Angular e2e Playwright config
- `src/e2e/playwright.config.ts` - Main e2e Playwright config

## Configuration

### Controller Config Options

Key configuration options in the `[Controller]` section:
- `max_tracked_files` - Maximum files to track in downloaded/extracted sets (default: 10000)

## Development Workflow

### Feature Development Process

1. **Create feature branch** from master
2. **Develop and commit** changes to feature branch
3. **Open PR** to master - CI runs tests
4. **Merge PR** when tests pass - CI publishes `:dev` image
5. **UAT testing** - pull `:dev` image and test in your environment
6. **Iterate** if needed (repeat steps 2-5)
7. **Release** when stable - tag version to publish production image

### CI/CD Behavior

| Trigger | Tests | Docker Publish |
|---------|-------|----------------|
| PR to master | ✓ Unit + E2E | None |
| Push to master | ✓ Unit + E2E | `:dev` tag |
| Tag `vX.Y.Z` | ✓ Unit + E2E | `:X.Y.Z` + `:latest` |

### UAT with :dev Tag

After merging to master, pull the dev image for testing:

```bash
docker pull ghcr.io/thejuran/seedsync:dev
docker compose up -d  # If compose points to :dev
```

The `:dev` tag always reflects the latest master commit. Test new features here before tagging a release.

### Planning Documents

Feature plans are stored in `planning docs/` folder with a session-based structure optimized for Claude Code:
- Each session is a self-contained unit of work
- Sessions include "Context to read" for efficient onboarding
- Progress, learnings, and blockers are tracked in each document

## Releases

### Versioning Scheme

The project follows [Semantic Versioning](https://semver.org/):

| Release Type | Version Format | Example | When to Use |
|--------------|----------------|---------|-------------|
| **Production** | `X.Y.Z` | `1.0.0`, `1.1.0` | Stable, tested releases |
| **Pre-release** | `X.Y.Z-beta.N` | `1.1.0-beta.1` | Feature-complete, needs testing |
| **Dev builds** | `X.Y.Z-dev.N` | `1.1.0-dev.42` | Bleeding edge (optional) |

### Docker Tag Strategy

```
ghcr.io/thejuran/seedsync:latest       # Latest stable release (production)
ghcr.io/thejuran/seedsync:1.0.0        # Pinned version (production)
ghcr.io/thejuran/seedsync:1.0          # Minor version track (gets patch updates)
```

| User Type | Recommended Tag | Why |
|-----------|-----------------|-----|
| Most users | `:latest` or `:X.Y.Z` | Stable, tested |
| Want auto-updates | `:X.Y` | Gets patch releases automatically |
| Debugging issues | `:X.Y.Z` exact | Reproducible environment |

### Version Files

When releasing, update version in these files:
1. `src/angular/package.json` (also drives the About page version display)
2. `src/debian/changelog`
3. `src/e2e/tests/about.page.spec.ts`

### Release Checklist

1. Update version in all 3 locations listed above
2. Update `src/debian/changelog` with release notes
3. Ensure all tests pass
4. Commit version bump, push to master
5. Create and push git tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`
6. Create GitHub Release with release notes: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."`
7. CI automatically builds and publishes Docker images and deb packages
8. Verify artifacts are available (GHCR image, GitHub Release .deb)

### Documentation Updates (after each release)

After tagging a release, update the documentation site:

1. Update `src/python/docs/changelog.md` with the new version entry
2. Update `src/python/docs/index.md` if features or platform support changed
3. Update `src/python/docs/install.md` if installation steps changed (e.g., new pinned version in tag table)
4. Deploy docs: `cd src/python && mkdocs gh-deploy --force`
5. Commit docs source changes to master and push

## Supported Platforms

**Architectures**: `amd64` (x86_64) and `arm64` (Raspberry Pi 3/4/5, Apple Silicon)

- **Linux**: Native deb packages for both amd64 and arm64
- **Windows/macOS**: Via Docker

Both deb packages and Docker images are built and tested for both architectures in CI using native GitHub ARM64 runners (no QEMU emulation).

## Recent Modernization (January 2026)

The codebase underwent significant modernization:

1. **Frontend**: Upgraded from Angular 4.x to Angular 19.x, Bootstrap 4 to 5
2. **Thread Safety**: Added synchronization to all listener collections
3. **Performance**: Replaced deep copy with freeze-on-add immutability pattern
4. **Memory Management**: Added bounded collections with LRU eviction
5. **Code Quality**: Refactored large methods (build_model, __update_model)
6. **Architecture**: Extracted ScanManager, LftpManager, FileOperationManager from Controller
7. **API**: Standardized HTTP status codes for error responses

See `planning docs/MODERNIZATION_ACTION_PLAN.md` and `planning docs/MODERNIZATION_REPORT.md` for details.
