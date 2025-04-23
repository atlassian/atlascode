FROM node:23-slim

# Install dependencies and xvfb
RUN apt-get update \
    && apt-get install -y wget gpg xauth curl \ 
    && npm install --global playwright \
    && npx playwright install --with-deps chromium

    # install code-server 
RUN curl -fsSL https://code-server.dev/install.sh -o install-code-server.sh && \
	sh install-code-server.sh && \
    curl -L https://github.com/redhat-developer/vscode-yaml/releases/download/1.17.0/vscode-yaml-1.17.0-3.vsix -o vscode-yaml-1.17.0-3.vsix

# Set the working directory
# We will mount the whole project directory to WORKDIR
# so it's best to match the WORKDIR folder name with the project directory name,
# otherwise tsc might generate wrong paths for e2e tests
WORKDIR /atlascode

# Where our vscode, chromedriver, images etc. will go
ENV TEST_RESOURCES=/atlascode/e2e/.resources

RUN cat <<EOF > /usr/bin/entrypoint.sh && chmod +x /usr/bin/entrypoint.sh
#!/usr/bin/env bash
set -ex
echo "installing dependencies for atlascode extension"
ls ..
code-server --install-extension ../vscode-yaml-1.17.0-3.vsix --force
echo "installing atlascode"
code-server --install-extension atlascode-0.0.0.vsix --force

echo "starting code-server"
code-server --auth none --bind-addr 0.0.0.0:9988 &
echo "Running tests"
npx playwright test ./e2e/tests/playwright.spec.ts
EOF

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
