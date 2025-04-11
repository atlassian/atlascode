const fs = require('fs');
const { dirname, join } = require('path');

const repoRoot = dirname(__dirname);

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(join(repoRoot, 'package-lock.json'), 'utf8'));

const PACKAGE_EXTRACT_REGEX = /.*(\@atlaskit\/[^\/]+)$/;

const packages = Object.entries(packageJson['packages'])
    .map(([pkg, { version }]) => {
        const result = PACKAGE_EXTRACT_REGEX.exec(pkg);
        if (result) {
            return {
                name: result[1],
                version,
            };
        }
        return null;
    })
    .filter(Boolean);

const packagePerVersion = {};
packages.forEach((pkg) => {
    if (!packagePerVersion[pkg.name]) {
        packagePerVersion[pkg.name] = [pkg.version];
    } else if (!packagePerVersion[pkg.name].includes(pkg.version)) {
        packagePerVersion[pkg.name].push(pkg.version);
    }
});

Object.entries(packagePerVersion)
    .filter(([, versions]) => versions.length > 1)
    .forEach(([pkg, versions], idx) => {
        console.log(`(${idx + 1}) ${pkg}: ${versions.join(', ')}`);
    });
