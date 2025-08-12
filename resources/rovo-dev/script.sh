#!/bin/bash

# Run this script to download and unzip the rovodev CLI tool
# Jump into the folder if not already there
cd resources/rovo-dev || true

# Clean up old files 

rm -rf rovodev.zip lib ripgrep 
rm atlassian_cli_rovodev
curl https://acli.atlassian.com/plugins/rovodev/darwin/amd64/0.10.4/rovodev.zip --output rovodev.zip

unzip rovodev.zip

rm rovodev.zip
