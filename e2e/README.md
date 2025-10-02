### What is this?

This is the WIP suite of end-to-end (E2E) tests we've implemented for Atlascode.

How does it work? In summary:

- We mock the various API calls made from the extension using wiremock
- We spin up a browser-based extension and use playwright to perform various actions
- All of that is run during the build in a docker container, with a supporting `wiremock` instance using docker-compose
- Analytics events are disabled during testing via the `DISABLE_ANALYTICS=1` env variable

### How do I use it?

To run the tests locally, it should be enough to do the following:

1.  First, prepare mock certificates for wiremock, using

```sh
 yarn test:e2e:sslcerts
```

2.  Build a docker image that we use for testing:

```sh
yarn test:e2e:docker:build
```

3.  Run tests headless in a docker container:

```sh
yarn test:e2e:docker
```

4. Check the output, and the artifacts provided in `./test-results`

---

⚠️ **Note**: Please be aware that the tests leverage a `.vsix` artifact produced by the build
To run E2E tests against changed code, you might need to re-build the extension by running

```sh
yarn extension:package
```

---

### Running code-server Locally for Testing

1. Follow the first two steps from the [How do I use it?](#how-do-i-use-it) section above.

2. Use the following command to start the testing environment

```sh
  yarn test:e2e:docker:serve
```

3. Open *http://127.0.0.1:9988* in browser. The code-server UI should be available.
