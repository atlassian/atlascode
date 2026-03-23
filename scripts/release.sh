#!/bin/bash 
set -e

git checkout main
git pull origin main

# If no version provided, calculate it automatically
if [ -z "$VERSION" ]; then
  echo "No version provided. Calculating next stable version..."
  
  # Calculate the latest version number
  latest_stable_version=$(./scripts/version/get-latest-stable.sh)
  echo "Latest stable version: $latest_stable_version"
  
  # Parse the version components
  major=$(echo $latest_stable_version | cut -d '.' -f 1)
  minor=$(echo $latest_stable_version | cut -d '.' -f 2)
  patch=$(echo $latest_stable_version | cut -d '.' -f 3)
  
  # Increment patch version for next stable release
  next_patch=$((patch + 1))
  VERSION="$major.$minor.$next_patch"
  
  echo "Next stable version: $VERSION"
fi

# call assert-stable.sh to check if the version is stable
./scripts/version/assert-stable.sh $VERSION

# Confirm that the CHANGELOG.md has been updated
if ! grep -q "## What's new in $VERSION" CHANGELOG.md; then
  echo "CHANGELOG.md has not been updated. Please update CHANGELOG.md with the changes in this release."
  exit 1
fi

# add v to the beginning of the version number
VERSION="v$VERSION"

MESSAGE=${2:-"Release $VERSION"}

git tag $VERSION -m "$MESSAGE"
git push origin $VERSION