FROM node:23-slim

# Install dependencies and xvfb
RUN apt-get update \
    && apt-get install -y wget gpg xauth curl git \
    && npm install --global playwright@1.53.0 \
    && npx playwright install --with-deps chromium

# install code-server
RUN curl -fsSL https://code-server.dev/install.sh -o install-code-server.sh \
    && sh install-code-server.sh \
    && curl -fL https://open-vsx.org/api/redhat/vscode-yaml/1.18.0/file/redhat.vscode-yaml-1.18.0.vsix -o redhat.vscode-yaml-1.18.0.vsix

# Set the working directory
# We will mount the whole project directory to WORKDIR
# so it's best to match the WORKDIR folder name with the project directory name,
# otherwise tsc might generate wrong paths for e2e tests
WORKDIR /atlascode

# Where our vscode, chromedriver, images etc. will go
ENV TEST_RESOURCES=/atlascode/e2e/.resources

# Disables StatSig feature flag and experiments in code
ENV ATLASCODE_NO_EXP=1

RUN cat <<EOF > /usr/bin/entrypoint.sh && chmod +x /usr/bin/entrypoint.sh
#!/usr/bin/env bash
set -ex

#Setting up git configuration
echo "Running git setup script..."
chmod +x ./e2e/setup-mock-repository.sh
./e2e/setup-mock-repository.sh

echo "setting up trusted certificate authorities"
cp ./e2e/sslcerts/rootCA.crt /usr/local/share/ca-certificates/atlascode_e2e_Root_CA.crt
update-ca-certificates

echo "installing dependencies for atlascode extension"
code-server --install-extension ../redhat.vscode-yaml-1.18.0.vsix --force
echo "installing atlascode"
code-server --install-extension atlascode-*.vsix --force

if [[ -z "\${ONLYSERVER}" ]]; then
    # start tests if ONLYSERVER is not set

    echo "starting code-server"
    code-server --auth none --disable-workspace-trust --bind-addr localhost:9988 &
    echo "Running tests"
    npx playwright test ./e2e/tests/**/*.spec.ts --workers=1
else
     # Only start server if ONLYSERVER is set
    echo "No e2e tests started. Only starting code-server."
    code-server --auth none --disable-workspace-trust --bind-addr 0.0.0.0:9988
fi

EOF

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
