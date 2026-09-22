1. Ensure you are on `main` and up to date: run `git checkout main && git fetch origin && git pull origin main`
2. Find the latest stable tag (exclude nightly tags): run `git fetch --tags && git tag --list 'v*' | grep -v 'nightly' | sort -V | tail -n 1`
3. Derive the next valid stable version from that tag by incrementing patch (e.g. `v4.0.22` -> `4.0.23`)
4. Validate the derived version is stable: run `./scripts/version/assert-stable.sh <next_version>`
5. Ensure `CHANGELOG.md` contains `## What's new in <next_version>`
6. Invoke the stable release script: run `npm run release:stable -- <next_version>`
7. If release message is needed, invoke with custom message: `npm run release:stable -- <next_version> "Release v<next_version>"`
