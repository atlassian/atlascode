FROM node:23-slim

# Install dependencies and xvfb
RUN apt-get update 
RUN apt-get install -y wget
RUN apt-get install -y gpg 
RUN apt-get install -y xvfb 
RUN apt-get install -y xauth 
RUN apt-get install -y curl

RUN npm install --global playwright
RUN npx playwright install --with-deps chromium

# Set the working directory
# We will mount the whole project directory to WORKDIR
# so it's best to match the WORKDIR folder name with the project directory name,
# otherwise tsc might generate wrong paths for e2e tests
WORKDIR /atlascode


# Where our vscode, chromedriver, images etc. will go
ENV TEST_RESOURCES=/atlascode/e2e/.resources

# install code-server 
RUN curl -fsSL https://code-server.dev/install.sh -o install-code-server.sh && \
	sh install-code-server.sh 


# We want to run `xvfb-run` with the parameters passed to `docker run`
# However, using `xvfb-run` as an entrypoint directly causes docker to hang (?!)
# So, let's create an entrypoint to pass parameters to xvfb-run.
# We'll do this in-place to not have any build context for this Dockerfile:
RUN cat <<EOF > /usr/bin/entrypoint.sh && chmod +x /usr/bin/entrypoint.sh
#!/usr/bin/env bash
echo "installing atlascode"
code-server --install-extension atlascode-0.0.0.vsix --force
echo "starting code-server"
code-server --auth none --bind-addr 0.0.0.0:9988 &
echo "Running playwright tests"
npx playwright test ./e2e/tests/playwright.spec.ts
EOF

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
