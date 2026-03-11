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

# If no version provided, calculate it automatically
if [ -z "$VERSION" ]; then
  echo ""
  echo "No version provided. Calculating next stable version..."
  
  # Step 1: Always start from main
  echo ""
  echo "Step 1: Switching to main branch..."
  git checkout main
  
  # Step 2: Fetch and update from remote
  echo ""
  echo "Step 2: Fetching and updating from remote..."
  git fetch origin
  git pull origin main
  git fetch --tags --force
  
  # Step 3: Calculate the latest version number
  echo ""
  echo "Step 3: Calculating next stable version..."
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
  
  # Ensure we're on main and up to date
  echo ""
  echo "Switching to main branch and updating..."
  git checkout main
  git fetch origin
  git pull origin main
  git fetch --tags --force
fi

# Validate the version is stable
echo ""
echo "Validating version is stable..."
./scripts/version/assert-stable.sh $VERSION

# Update CHANGELOG.md if needed
echo ""
echo "Checking CHANGELOG.md..."
if ! grep -q "## What's new in $VERSION" CHANGELOG.md; then
  echo "CHANGELOG.md needs update. Adding version entry..."
  
  # Find the first "## What's new" line and add the new version above it (only once)
  # Using awk for cross-platform compatibility
  awk -v version="$VERSION" '
    !found && /^## What'\''s new in/ {
      print "## What'\''s new in " version
      print ""
      found=1
    }
    { print }
  ' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
  echo "Added '## What's new in $VERSION' to CHANGELOG.md ✓"
  
  # Commit the changelog update
  git add CHANGELOG.md
  git commit -m "chore: update CHANGELOG for v$VERSION"
else
  echo "CHANGELOG.md already has entry for v$VERSION ✓"
fi

# Create release branch
echo ""
echo "Creating release branch..."
RELEASE_BRANCH="release/v$VERSION"
git checkout -b $RELEASE_BRANCH

# Add v to the beginning of the version number for tag
VERSION_TAG="v$VERSION"
MESSAGE=${3:-"Release $VERSION_TAG"}

echo ""
echo "Creating tag $VERSION_TAG..."
git tag $VERSION_TAG -m "$MESSAGE"

# Push to remote or show dry run message
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "========================================="
  echo "DRY RUN - Branch and tag created locally"
  echo "========================================="
  echo ""
  echo "Created locally:"
  echo "  - Branch: $RELEASE_BRANCH"
  echo "  - Tag: $VERSION_TAG"
  echo ""
  echo "To push to remote, run without 'dry' flag:"
  echo "  npm run release:stable"
  echo "  or"
  echo "  ./scripts/release.sh"
  echo ""
  echo "To clean up local artifacts, run:"
  echo "  git checkout main && git branch -D $RELEASE_BRANCH && git tag -d $VERSION_TAG && git checkout CHANGELOG.md"
else
  echo ""
  echo "Pushing to remote..."
  git push origin $RELEASE_BRANCH
  git push origin $VERSION_TAG
  
  echo ""
  echo "========================================="
  echo "✓ Release $VERSION_TAG completed!"
  echo "========================================="
  echo ""
  echo "Release branch: $RELEASE_BRANCH"
  echo "Tag: $VERSION_TAG"
  echo ""
  echo "Next steps:"
  echo "1. Create a PR from $RELEASE_BRANCH to main"
  echo "2. Review and merge the PR"
  echo "3. The GitHub release workflow will trigger automatically"
  echo ""
  echo "To create a draft PR, visit:"
  echo "https://github.com/atlassian/atlascode/pull/new/$RELEASE_BRANCH"
fi