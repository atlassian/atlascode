#!/usr/bin/env bash

# Get latest nightly tag from the repository
# Pre-releases are defined by the version number having an ODD minor number
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
git tag --list | \
    grep -E '^v[0-9]+\.([1-9][0-9]*)?[13579]\.[0-9]+' | \
    sort --version-sort -r | \
    head -n 1 | \
    cut -c 2- | \
    cut -d '-' -f 1
