# Sentry Logged Errors Fix Skill

This skill provides a systematic workflow for retrieving errors from Sentry, analyzing root causes, fixing code issues, and creating pull requests.

## Prerequisites

- **SENTRY_API_TOKEN**: Add to `.env` file (get from Sentry → Settings → API → Auth Tokens)
- **SENTRY_ORG**: Your Sentry organization slug
- **SENTRY_PROJECT**: Your Sentry project slug
- **Dependencies**: Load `error-handling.md` skill before using this skill

## Workflow

### 1. Ensure Codebase is Up-to-Date

**CRITICAL**: Before checking any errors, ensure you're working with the latest code:

#### Option A: Running from main branch (Recommended)
```bash
# 1. Switch to main branch
git checkout main

# 2. Sync with remote
git fetch origin
git pull origin main

# 3. Verify you're on latest
git status  # Should show "Your branch is up to date with 'origin/main'"
```

#### Option B: Running from feature branch
```bash
# 1. Ensure local main is synced with remote
git checkout main
git fetch origin
git pull origin main

# 2. Switch back to your feature branch
git checkout your-feature-branch

# 3. Rebase with latest main
git rebase main

# 4. Resolve any conflicts if needed
# 5. Continue: git rebase --continue
```

**Why this matters**: Sentry errors may be from old code that's already fixed in newer commits. Working from outdated code will cause you to fix issues that don't exist anymore.

### 2. Configure Environment

Add to your `.env` file:
```bash
SENTRY_API_TOKEN=your_token_here
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=your_project_slug
```

### 3. Retrieve Recent Errors from Sentry

Use Sentry API to fetch errors from the last 24 hours. **Important**: The `count` field shows total occurrences since the error was first reported, not just 24-hour frequency. Use the stats data instead:

```
GET https://sentry.io/api/0/projects/{SENTRY_ORG}/{SENTRY_PROJECT}/issues/
  ?statsPeriod=24h
  &sort=-freq
  &limit=50
```

Headers:
```
Authorization: Bearer {SENTRY_API_TOKEN}
```

**Key fields to extract:**
- `id` - Issue ID
- `title` - Error title/message
- `culprit` - Function/method where error occurred
- `metadata.value` - Error details
- `count` - **Total occurrences all-time** (NOT for 24h prioritization)
- `stats.24h` - **Array of [timestamp, count] pairs for last 24 hours** (USE THIS for prioritization)
- `level` - Severity (error, warning, etc.)
- `lastSeen` - Most recent occurrence

**Calculate 24-hour frequency:**
```javascript
// Sum all counts in the 24h stats window
const frequency24h = issue.stats['24h'].reduce((sum, [timestamp, count]) => sum + count, 0);

// Then sort issues by frequency24h in descending order
issues.sort((a, b) => {
  const freqA = a.stats['24h'].reduce((sum, [_, count]) => sum + count, 0);
  const freqB = b.stats['24h'].reduce((sum, [_, count]) => sum + count, 0);
  return freqB - freqA;
});
```

This ensures you fix the **most impactful errors in the current 24-hour window**, not just old errors that happened to be frequent historically.

### 4. Categorize and Present Errors to User

Before diving into fixes, create a summary table to help prioritize and let the user choose:

**Create**: `tmp_rovodev_sentry_errors_summary.md`

```markdown
# Sentry Errors Summary (Last 24 Hours)

**Total Errors**: {total_count}
**Error Categories**: {category_count}

| # | Error Category | 24h Count | % of Total | Level | Example Issue |
|---|----------------|-----------|------------|-------|---------------|
| 1 | Authentication errors (Jira/Bitbucket) | 31,573 | 68.5% | error | Unable to connect to Bitbucket |
| 2 | Network/Fetch errors (terminated) | 4,325 | 9.4% | error | TypeError: terminated |
| 3 | Token refresh failures | 3,750 | 8.1% | error | Token refresh failed |
| 4 | Axios errors (400/403) | 1,390 | 3.0% | error | Request failed with status code 400 |
| 5 | RovoDev entitlement errors | 1,016 | 2.2% | error | No valid Rovo Dev credentials |
| ... | ... | ... | ... | ... | ... |

**Instructions**:
- Enter a number (1-N) to fix errors in that category
- Enter **0** to fix all errors
- Multiple selections: 1,3,5
```

**Implementation**:
```javascript
// Group errors by category
const categories = {};
issues.forEach(issue => {
  const category = categorizeError(issue.title, issue.culprit);
  if (!categories[category]) {
    categories[category] = {
      errors: [],
      count24h: 0,
      level: issue.level,
      example: issue.title
    };
  }
  categories[category].errors.push(issue);
  categories[category].count24h += issue.freq24h;
});

// Calculate percentages and create table
const totalCount = Object.values(categories).reduce((sum, cat) => sum + cat.count24h, 0);
const sortedCategories = Object.entries(categories)
  .sort(([, a], [, b]) => b.count24h - a.count24h);

// Generate markdown table
let markdown = `# Sentry Errors Summary (Last 24 Hours)\n\n`;
markdown += `**Total Errors**: ${totalCount.toLocaleString()}\n`;
markdown += `**Error Categories**: ${sortedCategories.length}\n\n`;
markdown += `| # | Error Category | 24h Count | % of Total | Level | Example Issue |\n`;
markdown += `|---|----------------|-----------|------------|-------|---------------|\n`;

sortedCategories.forEach(([category, data], idx) => {
  const percentage = ((data.count24h / totalCount) * 100).toFixed(1);
  markdown += `| ${idx + 1} | ${category} | ${data.count24h.toLocaleString()} | ${percentage}% | ${data.level} | ${data.example.substring(0, 50)}... |\n`;
});

markdown += `\n**Instructions**:\n`;
markdown += `- Enter a number (1-${sortedCategories.length}) to fix errors in that category\n`;
markdown += `- Enter **0** to fix all errors\n`;
markdown += `- Multiple selections: 1,3,5\n`;

// Write to file
fs.writeFileSync('tmp_rovodev_sentry_errors_summary.md', markdown);
```

**Categorization function**:
```javascript
function categorizeError(title, culprit) {
  // Authentication errors
  if (title.includes('Unable to connect') || title.includes('sign in again')) {
    return 'Authentication errors (Jira/Bitbucket)';
  }
  
  // Network errors
  if (title.includes('terminated') || culprit.includes('Fetch')) {
    return 'Network/Fetch errors (terminated)';
  }
  
  // Token refresh
  if (title.includes('Token refresh failed')) {
    return 'Token refresh failures';
  }
  
  // Axios errors
  if (title.includes('AxiosError') || title.includes('status code')) {
    return 'Axios errors (HTTP errors)';
  }
  
  // RovoDev
  if (title.includes('RovoDevEntitlementError')) {
    return 'RovoDev entitlement errors';
  }
  
  // File system
  if (title.includes('ENOENT') || title.includes('FileSystemError')) {
    return 'File system errors';
  }
  
  // JSON parsing
  if (title.includes('JSON') || title.includes('parse')) {
    return 'JSON parsing errors';
  }
  
  // Default: use culprit or error type
  return culprit || title.split(':')[0] || 'Other errors';
}
```

**Present to user and get selection**:
```
Which error categories would you like to fix?
Enter numbers (e.g., 1,3,5) or 0 for all: _
```

### 5. Check If Error Still Exists in Current Code

**CRITICAL**: Before proceeding with fixes, verify the error can still occur:

1. **Locate the problematic code** using stack trace file paths and line numbers
2. **Check current code** - Does it still have the vulnerability that caused this error?
3. **Verify the error scenario** - Can the current code still produce this error given the conditions?
4. **If error is already fixed**:
   - Document that the issue has been resolved in a later commit
   - You can safely ignore this error (it won't happen again)
   - Skip to next error
5. **If error still exists**, proceed with root cause analysis

Example check:
```typescript
// Sentry error: "Cannot read property 'name' of undefined"
// Stack trace points to: src/user/userService.ts:45

// Check current code at that line:
const userName = user.profile.name; // ❌ Still vulnerable - no null check

// vs

// If current code is:
const userName = user?.profile?.name ?? 'Unknown'; // ✅ Already fixed - skip this error
```

### 6. Get Error Details and Stack Trace

For each selected error, retrieve detailed information:

```
GET https://sentry.io/api/0/issues/{ISSUE_ID}/events/latest/
```

**Extract:**
- Full stack trace with file paths and line numbers
- Error context (variables, state)
- Breadcrumbs (user actions leading to error)
- Tags (environment, release, user info)

### 7. Analyze Root Cause

For each error that still exists in current code:

1. **Examine error context** to understand the failure scenario
2. **Check related code** for similar patterns that might have the same issue
3. **Identify the root cause**:
   - Missing null/undefined checks
   - Unhandled promise rejections
   - Missing error handling in async operations
   - Type mismatches
   - Race conditions
   - Missing retry logic for network calls

### 8. Fix Code Following Error Handling Guidelines

Apply fixes based on the `error-handling.md` skill:

#### Check Severity Level
- **ERROR level**: Unexpected system failures, critical issues
- **WARN level**: User-related errors (401, 403, 4xx status codes)
- **DEBUG level**: Expected errors, informational only

#### Implement Fix with Proper Logging
```typescript
try {
    // operation
} catch (error) {
    // Choose appropriate level based on error type
    if (isUserError(error)) {
        logger.warn('User operation failed', error);
    } else {
        logger.error('System operation failed', error);
    }
    
    // Ensure dual logging to Sentry AND Amplitude
    sentryClient.captureException(error);
    amplitudeClient.logEvent('error_occurred', { error: error.message });
}
```

#### Handle Retry Loops Correctly
```typescript
let lastError;
for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
        return await operation();
    } catch (error) {
        lastError = error;
        // Only log on final failure
        if (attempt === maxRetries - 1) {
            logger.error('Operation failed after retries', error);
            sentryClient.captureException(error);
            amplitudeClient.logEvent('retry_exhausted', { attempts: maxRetries });
        }
    }
}
```

#### Avoid Duplicate Logging
- Log each error only once at the appropriate level
- If re-throwing, don't log again at higher levels
- Check if error has already been logged

### 9. Create Branch and Commit Fix

Use GitHub MCP tools:

```typescript
// 1. Create a branch
create_branch({
    owner: "repo-owner",
    repo: "repo-name",
    branch: "fix/sentry-{ISSUE_ID}-{short-description}",
    from_branch: "main"
})

// 2. Commit the fix
push_files({
    owner: "repo-owner",
    repo: "repo-name",
    branch: "fix/sentry-{ISSUE_ID}-{short-description}",
    files: [
        {
            path: "path/to/fixed/file.ts",
            content: "fixed-file-content"
        }
    ],
    message: "fix: resolve {error-title} (Sentry #{ISSUE_ID})\n\nFixes error occurring {count} times in last 24h.\n\nRoot cause: {description}\nSolution: {solution-description}"
})
```

### 10. Validate Fix

Before creating PR:

1. **Run relevant tests**:
   ```bash
   npm test -- path/to/fixed/file.test.ts
   ```

2. **Run linting**:
   ```bash
   npm run lint:fix
   ```

3. **Verify the fix addresses the root cause**, not just symptoms

### 11. Create Pull Request

```typescript
create_pull_request({
    owner: "repo-owner",
    repo: "repo-name",
    title: "fix: resolve {error-title} (Sentry #{ISSUE_ID})",
    body: `## Problem
Error occurring ${count} times in last 24 hours.

**Sentry Issue**: https://sentry.io/organizations/{org}/issues/{ISSUE_ID}/

**Error**: ${error_message}

**Root Cause**: ${root_cause_description}

## Solution
${solution_description}

## Testing
- [ ] Unit tests pass
- [ ] Linting passes
- [ ] Manual testing completed
- [ ] Follows error-handling.md guidelines

## Checklist
- [ ] Appropriate severity level (ERROR/WARN/DEBUG)
- [ ] Dual logging to Sentry and Amplitude
- [ ] No duplicate logging
- [ ] Retry logic handles errors correctly (if applicable)
`,
    head: "fix/sentry-{ISSUE_ID}-{short-description}",
    base: "main",
    draft: false
})
```

## Prioritization Strategy

Process errors in this order:
1. **Highest 24-hour frequency first** (use `stats['24h']` sum, not total `count`)
2. Within same 24h frequency, prioritize by severity
3. Group similar errors and fix together when possible

**Why use 24h frequency instead of total count?**
- Total `count` is inflated for old issues (includes occurrences from days/weeks/months ago)
- `stats['24h']` shows actual current impact
- Fixes the most recent/active errors first
- More accurate for deciding which errors are worth fixing now

## Using the Error Summary for Selection

Once the summary markdown is generated, you have three options:

### Option 1: Fix All Errors
```
Input: 0
Effect: Fix all error categories in order of impact (highest frequency first)
```

### Option 2: Fix Specific Categories
```
Input: 1
Effect: Fix only authentication errors (highest impact)

Input: 1,3,5
Effect: Fix categories #1, #3, and #5 in order
```

### Option 3: Skip to Next Session
```
Input: (quit/cancel)
Effect: Exit without fixing, rerun skill later when ready
```

**Recommended workflow**:
1. First session: Fix category #1 (highest frequency) - usually 5-10 errors
2. Second session: Run skill again, fix category #2
3. Continue until top categories resolved

This prevents overwhelming reviewers and allows iterative improvement.

## Batch Processing Tips

For efficiency when fixing multiple errors in a category:

1. **Group by root cause** - Multiple errors might stem from same issue
2. **Fix similar patterns** - If one file has an issue, check others with same pattern
3. **Create one PR per logical fix** - Don't combine unrelated fixes
4. **Limit to 5-10 errors per session** - Avoid overwhelming reviewers
5. **Verify 24h frequency improves** - Re-run skill next day to see impact

## Error Fix Checklist

Before submitting each PR:
- [ ] Working from latest main branch (or rebased feature branch)
- [ ] Verified error still exists in current code (not already fixed)
- [ ] Root cause identified and addressed
- [ ] Fix follows `error-handling.md` guidelines
- [ ] Appropriate severity level used
- [ ] Dual logging (Sentry + Amplitude) implemented
- [ ] No duplicate logging
- [ ] Retry logic correct (if applicable)
- [ ] Tests pass
- [ ] Linting passes
- [ ] PR description links to Sentry issue
- [ ] PR includes before/after context

## Common Error Patterns and Fixes

### Pattern 1: Unhandled Promise Rejections
```typescript
// Before (error prone)
async function fetchData() {
    const data = await apiCall(); // Can throw
    return data;
}

// After (proper error handling)
async function fetchData() {
    try {
        const data = await apiCall();
        return data;
    } catch (error) {
        logger.error('Failed to fetch data', error);
        throw error; // Re-throw if caller should handle
    }
}
```

### Pattern 2: Missing Null Checks
```typescript
// Before
const userName = user.profile.name; // user or profile might be null

// After
const userName = user?.profile?.name ?? 'Unknown';
```

### Pattern 3: Network Errors Without Retry
```typescript
// Before
const response = await fetch(url);

// After (with retry)
let lastError;
for (let attempt = 0; attempt < 3; attempt++) {
    try {
        const response = await fetch(url);
        return response;
    } catch (error) {
        lastError = error;
        if (attempt === 2) {
            logger.error('Fetch failed after retries', error);
        }
        await sleep(1000 * (attempt + 1)); // Exponential backoff
    }
}
throw lastError;
```

## Notes

- Always load the `error-handling.md` skill before starting fixes
- Update `.env.example` if adding new Sentry configuration variables
- Link Sentry issues in commit messages and PR descriptions
- Consider resolving the Sentry issue after PR is merged
