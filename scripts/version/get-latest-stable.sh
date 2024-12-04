#!/usr/bin/env bash

n_release=${1:-1}

# Get latest release tag from the repository
# Stable releases are defined by the version number having an EVEN minor number
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
git tag --list | \
    sort --version-sort -r | \
    grep -E '^v[0-9]+\.[0-9]*[02468]\.[0-9]+$' | \
    head -n $n_release | \
    tail -n 1 | \
    cut -c 2-
