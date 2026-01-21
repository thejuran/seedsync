#!/bin/bash

# exit on first error
set -e

echo "Running entrypoint"

echo "Installing SeedSync"
./expect_seedsync.exp

# Check if systemd is available and working
if [ -d /run/systemd/system ]; then
    echo "Systemd detected, starting via systemd"
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
