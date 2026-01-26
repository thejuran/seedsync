#!/bin/bash
set -e
dpkg -i /install/seedsync.deb
# Ensure the service is enabled
systemctl enable seedsync.service || true
