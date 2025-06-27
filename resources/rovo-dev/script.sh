#!/bin/bash

# Run this script to download and unzip the rovodev CLI tool
# Jump into the folder if not already there
cd resources/rovo-dev || true

# Clean up old files 

rm -rf rovodev.zip lib ripgrep 
rm atlassian_cli_rovodev
curl https://statlas.prod.atl-paas.net/rovodev-cli/releases/atlassian_cli_rovodev-latest-darwin-amd64.zip --output rovodev.zip

unzip rovodev.zip

rm rovodev.zip
