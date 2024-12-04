#!/usr/bin/env bash

n_release=${1:-1}

# Get latest nightly tag from the repository
# Pre-releases are defined by the version number having an ODD minor number
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions
git tag --list | \
    sort --version-sort -r | \
    grep -E '^v[0-9]+\.[0-9]*[13579]\.[0-9]+.*' | \
    head -n $n_release | \
    tail -n 1 | \
    cut -c 2-
