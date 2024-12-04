#!/usr/bin/env bash

# Make sure that the minor version is even
version=$1

if [[ $version =~ ^[0-9]+\.[0-9]*[02468]\.[0-9]+$ ]]; then
    echo "Version $version is a valid stable release (even minor version)"
    exit 0
else
    echo "Version $version is not a valid stable release (odd minor version or invalid format)"
    exit 1
fi
