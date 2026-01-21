#!/bin/bash

# exit on first error
set -e

echo "Running entrypoint"

echo "Installing SeedSync"
# Run install script directly (debconf value is pre-set via debconf-set-selections)
./install_seedsync.sh

# Determine if we should use systemd or run seedsync directly
# SEEDSYNC_NO_SYSTEMD=1 forces direct mode (useful for CI where systemd doesn't work)
USE_SYSTEMD=true

if [ "${SEEDSYNC_NO_SYSTEMD:-0}" = "1" ]; then
    echo "SEEDSYNC_NO_SYSTEMD=1 set, forcing direct mode"
    USE_SYSTEMD=false
elif [ ! -f /lib/systemd/systemd ]; then
    echo "Systemd binary not found, using direct mode"
    USE_SYSTEMD=false
elif [ ! -d /sys/fs/cgroup ]; then
    echo "Cgroups not mounted, systemd won't work, using direct mode"
    USE_SYSTEMD=false
fi

if [ "$USE_SYSTEMD" = "true" ]; then
    echo "Starting via systemd"
    echo "Continuing docker CMD"
    echo "$@"
    exec $@
else
    echo "Systemd not available, running seedsync directly"
    # Create required directories as user
    sudo -u user mkdir -p /home/user/.seedsync
    sudo -u user mkdir -p /home/user/.seedsync/log

    # Debug: check if binary exists and is executable
    echo "Checking seedsync binary..."
    ls -la /usr/lib/seedsync/seedsync || echo "Binary not found!"
    ls -la /usr/lib/seedsync/ || echo "Directory not found!"

    # Debug: check for html and scanfs
    echo "Checking html directory..."
    ls -la /usr/lib/seedsync/html/ 2>/dev/null | head -5 || echo "HTML directory not found!"
    echo "Checking scanfs..."
    ls -la /usr/lib/seedsync/scanfs 2>/dev/null || echo "scanfs not found!"

    # Run seedsync in a loop to handle restarts (since we don't have systemd to restart it)
    while true; do
        echo "========================================="
        echo "Starting seedsync at $(date)..."
        echo "========================================="
        # Run seedsync and capture exit code
        set +e
        sudo -u user /usr/lib/seedsync/seedsync --logdir /home/user/.seedsync/log -c /home/user/.seedsync
        EXIT_CODE=$?
        set -e
        echo "========================================="
        echo "Seedsync exited with code $EXIT_CODE at $(date)"
        echo "Restarting in 2 seconds..."
        echo "========================================="
        sleep 2
    done
fi
