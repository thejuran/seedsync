#!/bin/bash

# exit on first error for installation
set -e

echo "=== ENTRYPOINT ==="
echo "Running entrypoint"
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo "User: $(whoami)"

echo "=== Installing SeedSync ==="
./expect_seedsync.exp

echo "=== Checking seedsync installation ==="
ls -la /usr/lib/seedsync/ 2>&1 || true

echo "=== Checking binary ==="
file /usr/lib/seedsync/seedsync 2>&1 || true
ldd /usr/lib/seedsync/seedsync 2>&1 || true

# Create directories for seedsync (as user)
echo "=== Creating directories ==="
mkdir -p /home/user/.seedsync/log
chown -R user:user /home/user/.seedsync
ls -la /home/user/.seedsync/ 2>&1 || true

echo "=== Testing binary as user ==="
# Test if the binary can run at all (just show help)
su - user -c "/usr/lib/seedsync/seedsync --help" 2>&1 || echo "Help flag failed (might not exist), continuing..."

echo "=== Starting SeedSync directly (no systemd) ==="
# Run seedsync as user "user" in a restart loop
# Use exec su to properly forward signals
set +e
while true; do
    echo "$(date): Starting seedsync as user 'user'..."
    # Run seedsync directly using su, capturing all output
    su - user -s /bin/bash -c "cd /home/user && HOME=/home/user /usr/lib/seedsync/seedsync --logdir /home/user/.seedsync/log -c /home/user/.seedsync 2>&1"
    EXIT_CODE=$?
    echo "$(date): Seedsync exited with code $EXIT_CODE"

    # Show log file contents if they exist
    if [ -f /home/user/.seedsync/log/seedsync.log ]; then
        echo "=== Last 50 lines of seedsync.log ==="
        tail -50 /home/user/.seedsync/log/seedsync.log 2>&1 || true
    fi

    if [ $EXIT_CODE -ne 0 ]; then
        echo "Restarting seedsync in 2 seconds..."
        sleep 2
    else
        echo "Seedsync exited cleanly, restarting..."
        sleep 1
    fi
done
