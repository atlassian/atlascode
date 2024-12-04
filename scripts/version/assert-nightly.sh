#!/usr/bin/env bash

# Make sure that the minor version is odd
version=$1

if [[ $version =~ ^[0-9]+\.[0-9]*[13579]\.[0-9]+.*$ ]]; then
    echo "Version $version is a valid pre-release (odd minor version)"
    exit 0
else
    echo "Version $version is not a valid pre-release (even minor version or invalid format)"
    exit 1
fi
