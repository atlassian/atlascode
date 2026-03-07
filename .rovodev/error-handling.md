# Error Handling Guidelines

When implementing or reviewing error handling in the codebase, follow these principles:

## 1. Error Logging Requirements

All `try-catch` blocks should log errors appropriately based on severity and context.

## 2. Error Severity Levels

Use appropriate logging levels based on the error type:

- **ERROR level**: Use for unexpected errors, system failures, or critical issues that require immediate attention
- **WARN level**: Use for user-related errors such as:
  - 401 Unauthorized (authentication issues)
  - 403 Forbidden (permission issues)
  - Other client errors (4xx status codes) caused by user actions
- **DEBUG level**: Use for expected errors that don't require user intervention or are informational

## 3. Retry Loop Handling

When implementing retry logic:

- **Do NOT log errors** on intermediate retry attempts
- **Only log the error** if the final retry attempt fails
- This prevents duplicate logging and log spam for transient issues

Example pattern:
```typescript
let lastError;
for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
        // operation
        return result;
    } catch (error) {
        lastError = error;
        if (attempt === maxRetries - 1) {
            // Log only on final failure
            logger.error('Operation failed after retries', error);
        }
    }
}
```

## 4. Dual Logging Requirement

All error logging must be sent to **both**:
- **Sentry**: For error tracking and monitoring
- **Amplitude**: For analytics and user behavior tracking

Ensure both logging calls are made for every logged error.

## 5. No Duplicate Logging

- Each error should only be logged **once** at the appropriate level
- Avoid logging the same error at multiple levels (e.g., both ERROR and WARN)
- If an error is caught and re-thrown, only log at the final catch location
- Check if an error has already been logged before logging again

## Implementation Checklist

When adding error handling:
- [ ] Choose appropriate severity level (ERROR/WARN/DEBUG)
- [ ] If in retry loop, only log on final attempt
- [ ] Send to both Sentry and Amplitude
- [ ] Verify no duplicate logging in the call stack
- [ ] Include relevant context (user action, request details, etc.)
