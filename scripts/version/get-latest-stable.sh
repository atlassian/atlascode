#!/usr/bin/env bash

# Get latest release tag from the remote repository
# Stable releases are defined by the version number having an EVEN minor number
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions

# Fetch tags from remote to ensure we have the latest
git fetch --tags origin 2>/dev/null || true

git tag --list | \
    grep -E '^v[0-9]+\.([1-9][0-9]*)?[02468]\.[0-9]+$' | \
    sort --version-sort -r | \
    head -n 1 | \
    cut -c 2-
