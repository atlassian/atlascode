#!/bin/bash
set -e

echo "Setting up global git configuration..."
git config --global user.name "Mock User"
git config --global user.email "mockuser@atlassian.code"
git config --global init.defaultBranch main

echo "Creating mock repository that simulates a Bitbucket clone..."
mkdir /mock-repository
cd /mock-repository

# Initialize repository
git init

# Add remote and configure it properly (like git clone does)
git remote add origin git@bitbucket.org:mockuser/test-repository.git
git config branch.main.remote origin
git config branch.main.merge refs/heads/main
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"

# Create initial files
touch test.json test2.json README.md
echo "# Test Repository" > README.md
echo "{}" > test.json
echo '{"description": "Configuration file for testing", "enabled": true, "settings": {"debug": false, "timeout": 5000}}' > test2.json

# Commit files and set up tracking
git add .
git commit -m "Initial commit"
git branch -M main

# Simulate remote tracking (like after clone + fetch)
git update-ref refs/remotes/origin/main refs/heads/main

echo "Creating test branch with additional commits..."
# Create and switch to test branch
git checkout -b test-branch

# Add some changes to simulate development work
echo "Test feature implementation" >> README.md
echo '{"name": "test-project", "version": "1.0.0"}' > test.json
echo '{"description": "Updated configuration for testing", "enabled": true, "settings": {"debug": true, "timeout": 10000, "features": ["comments", "pullrequests"]}}' > test2.json

# Commit the changes
git add .
git commit -m "Add test feature with script.js and updated files"

cd ..


# repo for DC
mkdir /dc-repository
cd /dc-repository

git init

git remote add origin https://bitbucket.mockeddomain.com/mocked-project/dc-mocked-repo.git
git config branch.main.remote origin
git config branch.main.merge refs/heads/main
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"

touch test.json test2.json README.md
echo "# Test Repository" > README.md
echo "{}" > test.json
echo '{"description": "Configuration file for testing", "enabled": true, "settings": {"debug": false, "timeout": 5000}}' > test2.json

# Commit files and set up tracking
git add .
git commit -m "Initial commit"
git branch -M main

# Simulate remote tracking (like after clone + fetch)
git update-ref refs/remotes/origin/main refs/heads/main

echo "Creating test branch with additional commits..."
# Create and switch to test branch
git checkout -b test-branch

# Add some changes to simulate development work
echo "Test feature implementation" >> README.md
echo '{"name": "test-project", "version": "1.0.0"}' > test.json
echo '{"description": "Updated configuration for testing", "enabled": true, "settings": {"debug": true, "timeout": 10000, "features": ["comments", "pullrequests"]}}' > test2.json

# Commit the changes
git add .
git commit -m "Add test feature with script.js and updated files"

cd ..