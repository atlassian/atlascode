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

### Architecture
- All Atlassian API calls → `src/atlclients/`
- Webview communication → `src/ipc/`
- Authentication → `authStore.ts`

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