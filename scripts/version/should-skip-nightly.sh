#!/usr/bin/env bash

# Check if the current commit is the same as the last nightly release commit
# Exit with code 0 (should skip) if commits match, 1 (should build) if different

set -e

echo "Checking if nightly build should be skipped..." >&2

# Fetch all tags
git fetch --tags --force -q

# Get the latest nightly tag
latest_nightly_tag=$(git tag --list | \
    grep -E '^v[0-9]+\.([1-9][0-9]*)?[13579]\.[0-9]+-nightly$' | \
    sort --version-sort -r | \
    head -n 1)

if [ -z "$latest_nightly_tag" ]; then
    echo "No previous nightly release found. Proceeding with build." >&2
    exit 1
fi

echo "Latest nightly tag: $latest_nightly_tag" >&2

# Get the commit hash for the latest nightly tag
last_nightly_commit=$(git rev-list -n 1 "$latest_nightly_tag")
echo "Last nightly commit: $last_nightly_commit" >&2

# Get the current commit hash
current_commit=$(git rev-parse HEAD)
echo "Current commit: $current_commit" >&2

# Compare commits
if [ "$current_commit" = "$last_nightly_commit" ]; then
    echo "Current commit matches last nightly release. Skipping build." >&2
    exit 0
else
    echo "Current commit differs from last nightly release. Proceeding with build." >&2
    exit 1
fi
