# AI Agent Guidelines for AtlasCode

AtlasCode VSCode extension - Atlassian integration (Jira, Bitbucket, RovoDev)

## Key Directories
- `src/` - Main TypeScript source
- `src/react/` - React webview components  
- `src/atlclients/` - API clients & auth
- `src/rovo-dev/` - RovoDev functionality
- `e2e/` - Playwright tests

## Critical Patterns

### VSCode Extension Structure
- Commands: `package.json` → `contributes.commands`
- Menus: `package.json` → `contributes.menus` with `when` clauses
- Context keys: Set programmatically to control menu visibility

### Testing
- Unit: `*.test.ts` alongside source (`npm test`)
- React: `jest.react.config.ts` (`npm run test:react`) 
- E2E: `e2e/` directory (`npm run test:e2e`)
- Create issue React coverage lives under `src/webviews/components/issue/create-issue-screen/`; compact Create Work Item reducer/UI coverage lives under `src/react/atlascode/create-work-item/`

### Architecture
- All Atlassian API calls → `src/atlclients/`
- Webview communication → `src/ipc/`
- Authentication → `authStore.ts`
- Jira create flows have two surfaces: full editor (`src/webviews/createIssueWebview.ts` + `CreateIssuePage.tsx`) and compact work item view (`src/work-items/create-work-item/` + `src/react/atlascode/create-work-item/`)
- Jira API error payloads often include actionable field errors in `errors`; preserve and render those instead of replacing them with generic Axios status messages

### Common Gotchas
- `npm ci` may fail if `package-lock.json` is out of sync with `package.json`; avoid committing lockfile churn unless dependency updates are the task
- Public npm installs may fail on private Atlassian packages such as `@atlassian/assets-workspace-host`; note this explicitly when tests or lint cannot run locally

## Environment Context
- `atlascode:bbyEnvironmentActive` = Boysenberry (internal Atlassian environment)
- BBY: Users don't control RovoDev process (externally managed)
- Standard IDE: Users control their own process
- Features conditionally shown based on process control model

## Readme updates
- If authentication flow is changed, ensure that the readme is updated in a user-friendly way

## Changelog updates 
- After a code change is made, add a line to the changelog 

## Linting
- After code changes are finalized, run `npm run lint:fix`

# Updating this doc

**When:** After significant code changes, bug fixes, or discovering new patterns/gotchas. 

**How:** 
1. Ask user: "Would you like me to update AGENTS.md with learnings from this work?"
2. Add to relevant sections: architectural patterns → Critical Patterns, testing tips → Testing, common mistakes → Common Gotchas
3. Keep concise and actionable - focus on helping future agents avoid problems

**Include:** File patterns, integration points, auth requirements, testing strategies, error patterns
**Exclude:** Implementation details, temporary workarounds, user preferences
