#!/bin/bash 
set -e

VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Please provide a version number. Use even numbered minors for stable release. ex: X.2.x"
  exit 1
fi

# call asset-stable.sh to check if the version is stable
./scripts/version/assert-stable.sh $VERSION


# add v to the beginning of the version number
VERSION="v$VERSION"

MESSAGE=${2:-"Release $VERSION"}

git checkout main
git pull origin main 
git tag $VERSION -m "$MESSAGE"
git push origin $VERSION