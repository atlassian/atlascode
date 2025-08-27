#!/usr/bin/env bash

# Nightly version is defined by the latest stable release tag,
# except the minor version is incremented by one
# https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions

git fetch --tags >&2

echo "Evaluating next nightly version..." >&2

latest_stable_version=$(./scripts/version/get-latest-stable.sh)
latest_nightly_version=$(./scripts/version/get-latest-nightly.sh)
cat <<EOF >&2
----- available versions ------
Stable: $latest_stable_version
Nightly: $latest_nightly_version
EOF

# Major version is the same as the latest stable version
stable_major=$(echo $latest_stable_version | cut -d '.' -f 1)
nightly_major=$(echo $latest_nightly_version | cut -d '.' -f 1)

cat <<EOF >&2
----- major versions ------
Stable: $stable_major
Nightly: $nightly_major
EOF

# Minor version is always "latest stable + 1"
stable_minor=$(echo $latest_stable_version | cut -d '.' -f 2)
nightly_minor=$(echo $latest_nightly_version | cut -d '.' -f 2)
next_minor=$((stable_minor + 1))
cat <<EOF >&2
----- minor versions ------
Stable: $stable_minor
Nightly: $nightly_minor
Next nightly minor version: $next_minor
EOF

# Patch is incrementing, unless we're on a new minor or new major
if [[ $nightly_major -eq $stable_major && $next_minor -eq $nightly_minor ]]; then
    nightly_patch=$(echo $latest_nightly_version | cut -d '.' -f 3)
    next_patch=$((nightly_patch + 1))
else
    next_patch=0
fi

cat <<EOF >&2
----- next nightly version ------
Nightly: $stable_major.$next_minor.$next_patch
EOF
echo "$stable_major.$next_minor.$next_patch"
