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
    # Run seedsync directly as user
    exec sudo -u user /usr/lib/seedsync/seedsync --logdir /home/user/.seedsync/log -c /home/user/.seedsync
fi
