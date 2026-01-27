#!/bin/bash
set -e
dpkg -i /install/seedsync.deb
# Note: Not using systemd - seedsync is started directly by entrypoint
