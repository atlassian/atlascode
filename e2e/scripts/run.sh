#!/usr/bin/env bash

command="setup-and-run"

if [ "$1" == "--rerun" ]; then
    # Skip rebuilding the extension and setting up the tests
    # Use this if you are iterating in the tests themselves
    command="run-tests"
fi

extest ${command} \
    './.generated/atlascode/e2e/tests/*.test.js' \
    --code_version max \
    --code_settings e2e/test-settings.json \
    --extensions_dir .test-extensions
