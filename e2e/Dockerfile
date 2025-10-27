FROM node:23-slim

# Install dependencies and xvfb
RUN apt-get update \
    && apt-get install -y wget gpg xauth curl git \
    && npm install --global playwright@1.56.1 \
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
set -euo pipefail

# Set default target if not defined
TARGET=\${TARGET:-all}

# Setting up git configuration for Bitbucket tests
if [[ "\${TARGET}" == "bitbucket-cloud" || "\${TARGET}" == "bitbucket-dc" || "\${TARGET}" == "all" ]]; then
    echo ">> Running mock repository setup"
    chmod +x ./e2e/setup-mock-repository.sh
    ./e2e/setup-mock-repository.sh
fi

echo ">> Setting up trusted certificate authorities"
cp ./e2e/sslcerts/rootCA.crt /usr/local/share/ca-certificates/atlascode_e2e_Root_CA.crt
update-ca-certificates

echo ">> Installing dependencies for Atlascode extension"
code-server --install-extension ../redhat.vscode-yaml-1.18.0.vsix --force
echo ">> Installing Atlascode extension"
code-server --install-extension atlascode-*.vsix --force

if [[ -z "\${ONLYSERVER:-}" ]]; then
    # start tests if ONLYSERVER is not set

    echo ">> Starting code-server"
    code-server --auth none --disable-workspace-trust --bind-addr localhost:9988 &
    
    echo ">> Running e2e tests"
    
    SUPPORTED_TARGETS=("jira-cloud" "jira-dc" "bitbucket-cloud" "bitbucket-dc" "all")
    
    if [[ " \${SUPPORTED_TARGETS[*]} " =~ " \${TARGET} " ]]; then
        if [[ "\${TARGET}" == "all" ]]; then
            echo ">> WARNING: TARGET=all is not expected in CI - a specific target should be provided"
            echo ">> Running all tests as fallback"
            npx playwright test --workers=1
        else
            echo ">> Running \${TARGET} tests"
            npx playwright test --project=\${TARGET} --workers=1
        fi
    else
        echo ">> Unsupported target: \${TARGET}. Running all tests"
        npx playwright test --workers=1
    fi
    echo ">> E2e tests completed"
else
     # Only start server if ONLYSERVER is set
    echo "No e2e tests started. Only starting code-server."
    code-server --auth none --disable-workspace-trust --bind-addr 0.0.0.0:9988
fi

EOF

ENTRYPOINT ["/usr/bin/entrypoint.sh"]