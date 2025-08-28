#!/usr/bin/env bash

# Make sure that the minor version is odd
version=$1

if [[ $version =~ ^[0-9]+\.([1-9][0-9]*)?[13579]\.[0-9]+.*$ ]]; then
    echo "Version $version is a valid pre-release (odd minor version)"
else
    echo "Version $version is not a valid pre-release (even minor version or invalid format)"
    exit 1
fi

tag="v$version-nightly"
if git rev-parse "$tag" >/dev/null 2>&1; then
    echo "Version $version already exists!"
    exit 1
fi

exit 0