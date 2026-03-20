#!/bin/bash 
set -e

# Check for dry flag (must be first argument)
DRY_RUN=false
if [ "$1" = "dry" ]; then
  DRY_RUN=true
  echo "========================================="
  echo "DRY RUN MODE - No remote push"
  echo "========================================="
fi

echo "========================================="
echo "Automated Stable Release Script"
echo "========================================="

# Always start from main and update from remote
echo ""
echo "Switching to main branch and updating..."
git checkout main
git fetch origin
git pull origin main
git fetch --tags --force

# If no version provided, calculate it automatically
if [ -z "$VERSION" ]; then
  echo ""
  echo "No version provided. Calculating next stable version..."

  # Calculate the latest version number
  echo ""
  echo "Calculating next stable version..."
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
else
  echo ""
  echo "Using provided version: $VERSION"
fi

# Validate the version is stable
echo ""
echo "Validating version is stable..."
./scripts/version/assert-stable.sh $VERSION

# Add v to the beginning of the version number for tag
VERSION_TAG="v$VERSION"
MESSAGE=${3:-"Release $VERSION_TAG"}

# Push to remote or show dry run message
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "Creating tag $VERSION_TAG..."
  git tag $VERSION_TAG -m "$MESSAGE"

  echo ""
  echo "========================================="
  echo "DRY RUN - Tag created locally"
  echo "========================================="
  echo ""
  echo "Created locally:"
  echo "  - Tag: $VERSION_TAG"
  echo ""
  echo "To push to remote, run without 'dry' flag:"
  echo "  npm run release:stable"
  echo "  or"
  echo "  ./scripts/release.sh"
  echo ""
  echo "To clean up local artifacts, run:"
  echo "  git tag -d $VERSION_TAG"
else
  if ! grep -q "## What's new in $VERSION" CHANGELOG.md; then
    echo "CHANGELOG.md has not been updated. Please update CHANGELOG.md with the changes in this release."
    exit 1
  fi

  echo ""
  echo "Pushing to remote..."
  git tag $VERSION_TAG -m "$MESSAGE"
  git push origin $VERSION_TAG
  
  echo ""
  echo "========================================="
  echo "✓ Release $VERSION_TAG completed!"
  echo "========================================="
  echo ""
  echo "Tag: $VERSION_TAG"
fi