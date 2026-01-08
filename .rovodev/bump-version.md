1. Either the user provided a new version number, or read the latest Rovo Dev version from https://bitbucket.org/atlassian/acra-python/src/main/packages/cli-rovodev/src/rovodev/version.py
2. Read the current version specified in package.json under "rovoDev" -> "version" property
3. If the current version is not equal to the new version then bump to the latest version in package.json
