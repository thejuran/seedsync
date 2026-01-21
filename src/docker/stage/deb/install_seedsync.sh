#!/bin/bash
set -e
# Pre-set debconf value to avoid interactive prompt
# This is needed because in non-interactive environments, debconf uses the default (root)
echo "seedsync seedsync/username string user" | debconf-set-selections
dpkg -i /install/seedsync.deb
