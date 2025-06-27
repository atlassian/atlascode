#!/bin/bash

# Run this script within the resources/rovo-dev directory to download and unzip the rovodev CLI tool.

# Clean up old files 
rm -rf rovodev.zip lib ripgrep 
rm atlassian_cli_rovodev
curl https://statlas.prod.atl-paas.net/rovodev-cli/releases/atlassian_cli_rovodev-latest-darwin-amd64.zip --output rovodev.zip

unzip rovodev.zip

rm rovodev.zip
