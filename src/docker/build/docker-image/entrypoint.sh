#!/bin/bash

# Entrypoint script that handles restarts for seedsync
# When seedsync receives a restart command, it exits with code 0
# This script loops to restart it automatically

while true; do
    echo "========================================="
    echo "Starting seedsync at $(date)..."
    echo "========================================="

    python /app/python/seedsync.py \
        -c /config \
        --html /app/html \
        --scanfs /app/scanfs

    EXIT_CODE=$?

    echo "========================================="
    echo "Seedsync exited with code $EXIT_CODE at $(date)"

    # Exit code 0 typically means restart was requested
    # Any other exit code is an error
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Restart requested, restarting in 1 second..."
    else
        echo "Unexpected exit, restarting in 2 seconds..."
    fi
    echo "========================================="

    sleep 1
done
