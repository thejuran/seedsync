# Creates environment to build python binaries
# Using Debian 11 (bullseye) with GLIBC 2.31 for compatibility with older systems
# Ubuntu 22.04 uses GLIBC 2.35 which causes runtime errors on older distros
FROM python:3.11-slim-bullseye AS seedsync_build_pyinstaller_env
# Install build dependencies
RUN apt-get update && apt-get install -y \
    binutils \
    build-essential \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*
# Install Poetry
RUN pip3 install poetry && \
    poetry config virtualenvs.create false
COPY src/python/pyproject.toml /app/python/
COPY src/python/poetry.lock /app/python/
WORKDIR /python
ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
RUN cd /app/python && poetry install


# Builds seedsync with pyinstaller
# Output is in /build/dist/seedsync/
FROM seedsync_build_pyinstaller_env AS seedsync_build_pyinstaller
COPY src/python /python
COPY src/pyinstaller_hooks /pyinstaller_hooks
RUN mkdir -p /build
RUN pyinstaller /python/seedsync.py \
    -y \
    -p /python \
    --distpath /build/dist \
    --workpath /build/work \
    --specpath /build \
    --additional-hooks-dir /pyinstaller_hooks/ \
    --name seedsync


# Builds scanfs with pyinstaller
# Output is in /build/dist/
FROM seedsync_build_pyinstaller_env AS seedsync_build_scanfs
COPY src/python /python
RUN mkdir -p /build
RUN	pyinstaller /python/scan_fs.py \
    -y \
    --onefile \
    -p /python \
    --distpath /build/dist \
    --workpath /build/work \
    --specpath /build \
    --name scanfs


# Creates environment for angular
# Note: Using Node 20 LTS with Angular 13.x and Dart Sass
# --legacy-peer-deps required for peer dependency conflicts
FROM node:20-slim AS seedsync_build_angular_env
COPY src/angular/package*.json /app/
WORKDIR /app
# Ensure NODE_ENV is not production so devDependencies (including @angular/cli) are installed
ENV NODE_ENV=development
# Install all dependencies including devDependencies
# Note: Angular 13+ CLI binary is ng.js, not ng
RUN npm install --include=dev --legacy-peer-deps && \
    test -f node_modules/@angular/cli/bin/ng.js || (echo "ERROR: @angular/cli not installed" && exit 1)

# Builds angular app into html
# Output is in /build/dist/
FROM seedsync_build_angular_env AS seedsync_build_angular
COPY src/angular /app
WORKDIR /app
RUN mkdir -p /build
# Verify node_modules exists, reinstall if missing (handles Docker cache issues)
RUN if [ ! -f node_modules/@angular/cli/bin/ng.js ]; then npm install --legacy-peer-deps; fi
# Use --configuration=production (--prod is deprecated in Angular 12+)
# Note: Angular 13+ CLI binary is ng.js
RUN node node_modules/@angular/cli/bin/ng.js build --configuration=production --output-path /build/dist/


# Creates environment to build deb packages
FROM ubuntu:22.04 AS seedsync_build_deb_env
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
# Note: dh-systemd is merged into debhelper in Ubuntu 22.04+
RUN apt-get install -y build-essential debhelper
RUN apt-get install -y devscripts


# Builds debian package
# Output is in /build/dist/
FROM seedsync_build_deb_env AS seedsync_build_deb
RUN mkdir -p /build/work
COPY src/debian /build/work/debian
COPY --from=seedsync_build_pyinstaller /build/dist/seedsync /build/work/seedsync
# Copy scanfs into _internal directory where PyInstaller expects it (sys._MEIPASS)
COPY --from=seedsync_build_scanfs /build/dist/scanfs /build/work/seedsync/_internal/
# Copy html into _internal directory where PyInstaller expects it (sys._MEIPASS)
COPY --from=seedsync_build_angular /build/dist /build/work/seedsync/_internal/html
WORKDIR /build/work
RUN dpkg-buildpackage -B -uc -us
RUN ls /build/*.deb && echo "----" && ls /build/work


# Exports deb package to host
FROM scratch AS seedsync_build_deb_export
COPY --from=seedsync_build_deb /build/*.deb .

# Exports scanfs to host
FROM scratch AS seedsync_build_scanfs_export
COPY --from=seedsync_build_scanfs /build/dist/scanfs .

# Exports html to host
FROM scratch AS seedsync_build_angular_export
COPY --from=seedsync_build_angular /build/dist ./html
