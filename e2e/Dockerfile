FROM node:20.18.1-bookworm-slim

# Install dependencies and xvfb
RUN apt-get update && apt-get install -y wget gpg xvfb xauth --no-install-recommends

# Download vscode .deb package and install it (from https://go.microsoft.com/fwlink/?LinkID=760868)
# Otherwise vscode fails to run, probably due to missing dependencies
RUN wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg \
    && install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg \
    && echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | tee /etc/apt/sources.list.d/vscode.list > /dev/null \
    && rm -f packages.microsoft.gpg \
    && apt install -y apt-transport-https \
    && apt update \
    && apt install -y code \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@latest

# Running vscode as root is not recommended, so let's create a user.
# We need that user's $HOME to exist for the test process to work properly.
RUN useradd -m -s /bin/bash atlascode

# Set the working directory
# We will mount the whole project directory to WORKDIR
# so it's best to match the WORKDIR folder name with the project directory name,
# otherwise tsc might generate wrong paths for e2e tests
WORKDIR /atlascode

# Where our vscode, chromedriver, images etc. will go
ENV TEST_RESOURCES=/atlascode/e2e/.resources

# We want to run `xvfb-run` with the parameters passed to `docker run`
# However, using `xvfb-run` as an entrypoint directly causes docker to hang (?!)
# So, let's create an entrypoint to pass parameters to xvfb-run.
# We'll do this in-place to not have any build context for this Dockerfile:
RUN cat <<EOF > /usr/bin/entrypoint.sh && chmod +x /usr/bin/entrypoint.sh
#!/usr/bin/env bash
echo "Invoking xvfb-run with the following arguments: \$@"
xvfb-run \$@
EOF

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
