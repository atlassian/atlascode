# Proposal: React-Side Rendering Analytics with Drift Measurement

## Executive Summary

This document proposes adding analytics to track when message chunks are **actually rendered and visible** to users in the React UI, and measuring the **drift** (delay) between when the provider receives messages and when they appear in the UI.

## Current State

### What We Track Today (Provider-Side Only)

| Event | Location | What It Measures |
|-------|----------|------------------|
| `timeToFirstByte` | Provider | Time from prompt sent → first byte from API |
| `timeToFirstMessage` | Provider | Time from prompt sent → first message parsed |
| `timeToLastMessage` | Provider | Time from prompt sent → last message parsed |

### The Gap

**Provider-side timing ≠ User-perceived timing**

The current metrics measure when the **provider** receives and processes data, NOT when the user actually **sees** it rendered in the UI. There's an unmeasured delay caused by:

1. **IPC (Inter-Process Communication):** Provider → React webview messaging
2. **React Rendering:** State updates, virtual DOM reconciliation, actual DOM updates
3. **Browser Rendering:** Paint, composite, display on screen (not measured)

---

## Proposed Solution

### Architecture Overview

```
API Response
    ↓
Provider receives first chunk (t1) ← CURRENTLY TRACKED
    ↓ [DRIFT ZONE - UNMEASURED]
    ↓
Provider sends to React via postMessage (t2) + timestamp
    ↓
React receives message (t3)
    ↓
React renders to DOM (t4) ← PROPOSED: Track this
```

### Key Measurements

1. **Provider-to-React Drift:** `t3 - t2` (IPC latency)
2. **React Rendering Time:** `t4 - t3` (React processing)
3. **Total Drift:** `t4 - t1` (Total delay from provider receipt to UI display)

---

## Implementation Plan

### Phase 1: Add Timestamps to Provider Messages

**File:** `src/rovo-dev/rovoDevChatProvider.ts`

**Changes:**

#### 1. Attach timestamps when sending messages to React

```typescript
// In processRovoDevResponse() method (line 371-408)
private async processRovoDevResponse(sourceApi: StreamingApi, response: RovoDevResponse): Promise<void> {
    const fireTelemetry = sourceApi === 'chat';
    const webview = this._webView!;
    
    // NEW: Attach provider timestamp
    const providerReceivedTimestamp = performance.now();
    
    // ... existing code ...
    
    switch (response.event_kind) {
        case 'text':
        case 'tool-call':
        case 'tool-return':
            await webview.postMessage({
                type: RovoDevProviderMessageType.RovoDevResponseMessage,
                message: response,
                // NEW: Add metadata for drift tracking
                metadata: {
                    providerReceivedAt: providerReceivedTimestamp,
                    providerSentAt: performance.now(),
                    promptId: this._currentPromptId,
                    isFirstMessage: this._isFirstMessageForPrompt,
                },
            });
            
            // NEW: Track first message flag
            if (this._isFirstMessageForPrompt) {
                this._isFirstMessageForPrompt = false;
            }
            break;
        // ... rest of cases
    }
}
```

#### 2. Add tracking flag to chat provider

```typescript
// In RovoDevChatProvider class (line 39-88)
export class RovoDevChatProvider {
    // ... existing fields ...
    
    private _isFirstMessageForPrompt = false; // NEW
    
    private beginNewPrompt(overrideId?: string): void {
        this._currentPromptId = overrideId || v4();
        this._telemetryProvider.startNewPrompt(this._currentPromptId);
        this._isFirstMessageForPrompt = true; // NEW: Reset flag
    }
}
```

---

### Phase 2: Update Message Type Definitions

**File:** `src/rovo-dev/rovoDevWebviewProviderMessages.ts`

**Changes:**

```typescript
// Add new metadata interface (insert after line 10)
export interface RovoDevMessageMetadata {
    providerReceivedAt: number;  // performance.now() when provider got message from API
    providerSentAt: number;      // performance.now() when provider sent to React
    promptId: string;
    isFirstMessage?: boolean;
}

// Update RovoDevResponseMessage type (line 58-61)
| ReducerAction<
      RovoDevProviderMessageType.RovoDevResponseMessage,
      { 
          message: RovoDevResponseMessageType | RovoDevResponseMessageType[];
          metadata?: RovoDevMessageMetadata;  // NEW
      }
  >

// Add CompleteMessage metadata (line 62)
| ReducerAction<
      RovoDevProviderMessageType.CompleteMessage,
      { metadata?: { promptId: string; providerSentAt: number } }  // NEW
  >
```

---

### Phase 3: Add New Analytics Message Types

**File:** `src/rovo-dev/ui/rovoDevViewMessages.tsx`

**Changes:**

```typescript
// Add new analytics event types (insert after line 37)
export const enum RovoDevViewResponseType {
    // ... existing types ...
    OpenRovoDevLogFile = 'openRovoDevLogFile',
    
    // NEW: Analytics events
    ReportFirstChunkRendered = 'reportFirstChunkRendered',
    ReportLastChunkRendered = 'reportLastChunkRendered',
}

// Add to RovoDevViewResponse union type (insert after line 87)
export type RovoDevViewResponse =
    // ... existing types ...
    | ReducerAction<RovoDevViewResponseType.OpenRovoDevLogFile>
    
    // NEW: Analytics events
    | ReducerAction<
          RovoDevViewResponseType.ReportFirstChunkRendered,
          { 
              promptId: string;
              providerReceivedAt: number;
              providerSentAt: number;
              reactReceivedAt: number;
              reactRenderedAt: number;
          }
      >
    | ReducerAction<
          RovoDevViewResponseType.ReportLastChunkRendered,
          { 
              promptId: string;
              providerReceivedAt: number;
              providerSentAt: number;
              reactReceivedAt: number;
              reactRenderedAt: number;
          }
      >;
```

---

### Phase 4: Track Rendering in React

**File:** `src/rovo-dev/ui/rovoDevView.tsx`

**Changes:**

#### 1. Add state for tracking

```typescript
// In RovoDevView component (insert after line 71)
const [thinkingBlockEnabled, setThinkingBlockEnabled] = useState(true);

// NEW: Tracking first/last chunk rendering
const [firstChunkMetadata, setFirstChunkMetadata] = useState<{
    promptId: string;
    providerReceivedAt: number;
    providerSentAt: number;
    reactReceivedAt: number;
} | null>(null);

const [lastChunkPending, setLastChunkPending] = useState<{
    promptId: string;
    providerReceivedAt: number;
    providerSentAt: number;
    reactReceivedAt: number;
} | null>(null);
```

#### 2. Capture metadata when messages arrive

```typescript
// In onMessageHandler (line 240-444), update RovoDevResponseMessage case
case RovoDevProviderMessageType.RovoDevResponseMessage:
    setCurrentState((prev) =>
        prev.state === 'WaitingForPrompt' ? { state: 'GeneratingResponse' } : prev,
    );

    const messages = Array.isArray(event.message) ? event.message : [event.message];
    
    // NEW: Capture timing metadata
    const reactReceivedAt = performance.now();
    const metadata = event.metadata;
    
    // NEW: Track first message chunk
    if (metadata?.isFirstMessage && !firstChunkMetadata) {
        setFirstChunkMetadata({
            promptId: metadata.promptId,
            providerReceivedAt: metadata.providerReceivedAt,
            providerSentAt: metadata.providerSentAt,
            reactReceivedAt,
        });
    }

    // ... existing message processing ...
    break;

case RovoDevProviderMessageType.CompleteMessage:
    // NEW: Track last message chunk
    if (event.metadata && currentState.state === 'GeneratingResponse') {
        setLastChunkPending({
            promptId: event.metadata.promptId,
            providerReceivedAt: performance.now(), // Use current time as proxy
            providerSentAt: event.metadata.providerSentAt,
            reactReceivedAt: performance.now(),
        });
    }
    
    if (
        currentState.state === 'GeneratingResponse' ||
        currentState.state === 'ExecutingPlan' ||
        currentState.state === 'CancellingResponse'
    ) {
        setCurrentState({ state: 'WaitingForPrompt' });
    }
    // ... existing code ...
    break;
```

#### 3. Track when first chunk is rendered

```typescript
// Add after history state updates (insert around line 237)
React.useEffect(() => {
    if (firstChunkMetadata && history.length > 0) {
        // Wait for next paint to ensure DOM is updated
        requestAnimationFrame(() => {
            const reactRenderedAt = performance.now();
            
            // Send analytics event
            postMessage({
                type: RovoDevViewResponseType.ReportFirstChunkRendered,
                promptId: firstChunkMetadata.promptId,
                providerReceivedAt: firstChunkMetadata.providerReceivedAt,
                providerSentAt: firstChunkMetadata.providerSentAt,
                reactReceivedAt: firstChunkMetadata.reactReceivedAt,
                reactRenderedAt,
            });
            
            // Clear tracking state
            setFirstChunkMetadata(null);
        });
    }
}, [firstChunkMetadata, history, postMessage]);
```

#### 4. Track when last chunk is rendered

```typescript
// Add after first chunk tracking effect
React.useEffect(() => {
    if (lastChunkPending && currentState.state === 'WaitingForPrompt') {
        // Wait for next paint to ensure DOM is updated
        requestAnimationFrame(() => {
            const reactRenderedAt = performance.now();
            
            // Send analytics event
            postMessage({
                type: RovoDevViewResponseType.ReportLastChunkRendered,
                promptId: lastChunkPending.promptId,
                providerReceivedAt: lastChunkPending.providerReceivedAt,
                providerSentAt: lastChunkPending.providerSentAt,
                reactReceivedAt: lastChunkPending.reactReceivedAt,
                reactRenderedAt,
            });
            
            // Clear tracking state
            setLastChunkPending(null);
        });
    }
}, [lastChunkPending, currentState.state, postMessage]);
```

---

### Phase 5: Handle Analytics in Provider

**File:** `src/rovo-dev/rovoDevWebviewProvider.ts`

**Changes:**

```typescript
// In resolveWebviewView method, add new cases (insert after line 487)
case RovoDevViewResponseType.ReportFirstChunkRendered:
    this._telemetryProvider.fireTelemetryEvent(
        'rovoDevFirstChunkRenderedEvent',
        e.promptId,
        {
            providerToReactDriftMs: e.reactReceivedAt - e.providerSentAt,
            reactRenderTimeMs: e.reactRenderedAt - e.reactReceivedAt,
            totalDriftMs: e.reactRenderedAt - e.providerReceivedAt,
            timeToFirstVisibleMs: e.reactRenderedAt, // Relative to prompt start
        }
    );
    break;

case RovoDevViewResponseType.ReportLastChunkRendered:
    this._telemetryProvider.fireTelemetryEvent(
        'rovoDevLastChunkRenderedEvent',
        e.promptId,
        {
            providerToReactDriftMs: e.reactReceivedAt - e.providerSentAt,
            reactRenderTimeMs: e.reactRenderedAt - e.reactReceivedAt,
            totalDriftMs: e.reactRenderedAt - e.providerReceivedAt,
            timeToLastVisibleMs: e.reactRenderedAt, // Relative to prompt start
        }
    );
    break;
```

---

### Phase 6: Add Analytics Events

**File:** `src/rovo-dev/rovoDevTelemetryProvider.ts`

**Changes:**

```typescript
// Add method signatures (inspect current file and add similar to existing methods)
public fireTelemetryEvent(
    eventName: 'rovoDevFirstChunkRenderedEvent',
    promptId: string,
    metrics: {
        providerToReactDriftMs: number;
        reactRenderTimeMs: number;
        totalDriftMs: number;
        timeToFirstVisibleMs: number;
    }
): void;

public fireTelemetryEvent(
    eventName: 'rovoDevLastChunkRenderedEvent',
    promptId: string,
    metrics: {
        providerToReactDriftMs: number;
        reactRenderTimeMs: number;
        totalDriftMs: number;
        timeToLastVisibleMs: number;
    }
): void;
```

**File:** `src/rovo-dev/analytics/rovodevAnalyticsApi.ts`

**Changes:**

```typescript
// Add new event factory functions (insert after line 160)

export function rovoDevFirstChunkRenderedEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    metrics: {
        providerToReactDriftMs: number;
        reactRenderTimeMs: number;
        totalDriftMs: number;
        timeToFirstVisibleMs: number;
    },
) {
    return trackEvent('rovoDevFirstChunkRendered', 'atlascode', {
        attributes: { 
            rovoDevEnv, 
            appInstanceId, 
            sessionId, 
            promptId,
            ...metrics,
        },
    });
}

export function rovoDevLastChunkRenderedEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    metrics: {
        providerToReactDriftMs: number;
        reactRenderTimeMs: number;
        totalDriftMs: number;
        timeToLastVisibleMs: number;
    },
) {
    return trackEvent('rovoDevLastChunkRendered', 'atlascode', {
        attributes: { 
            rovoDevEnv, 
            appInstanceId, 
            sessionId, 
            promptId,
            ...metrics,
        },
    });
}
```

---

---

## Data Analysis: What We Can Learn

### Drift Breakdown

With these metrics, we can analyze:

1. **IPC Latency:** `providerToReactDriftMs`
   - How long messages take to cross process boundary
   - Expected: < 5ms typically, but can spike under load

2. **React Rendering Time:** `reactRenderTimeMs`
   - How long React takes to update DOM
   - Expected: < 16ms for 60fps, but varies with complexity

3. **Total Drift:** `totalDriftMs`
   - End-to-end delay from provider receipt to UI display
   - This is the **perceived latency** users experience

### Example Queries

```javascript
// Average drift by metric
SELECT 
    AVG(providerToReactDriftMs) as avg_ipc_latency,
    AVG(reactRenderTimeMs) as avg_render_time,
    AVG(totalDriftMs) as avg_total_drift,
    PERCENTILE(totalDriftMs, 95) as p95_total_drift
FROM rovoDevFirstChunkRendered
WHERE rovoDevEnv = 'IDE'
GROUP BY date_trunc('day', timestamp);

// Drift correlation with response length
SELECT 
    LENGTH(content) as response_length,
    AVG(totalDriftMs) as avg_drift
FROM rovoDevFirstChunkRendered
JOIN chat_responses USING (promptId)
GROUP BY LENGTH(content)
ORDER BY response_length;
```

---

## Performance Considerations

### Impact Assessment

| Component | Impact | Mitigation |
|-----------|--------|------------|
| `performance.now()` calls | Negligible (~microseconds) | Native browser API, highly optimized |
| `requestAnimationFrame()` | Minimal | Already used for scrolling, adds one callback |
| Message size increase | ~100 bytes per message | Acceptable for analytics value |

### Best Practices

1. **Batch Analytics:** Only send after rendering completes, not on every chunk
2. **Debounce:** Use `requestAnimationFrame` to avoid excessive measurements
3. **Conditional Tracking:** Only track when webview is visible
4. **Cleanup:** Clear state after use

---

## Testing Strategy

### Unit Tests

**File:** `src/rovo-dev/ui/rovoDevView.test.tsx` (create if doesn't exist)

```typescript
describe('React Rendering Analytics', () => {
    it('should track first chunk rendering', async () => {
        const { postMessage } = setup();
        
        // Simulate receiving first message with metadata
        receiveMessage({
            type: RovoDevProviderMessageType.RovoDevResponseMessage,
            message: { event_kind: 'text', content: 'Hello' },
            metadata: {
                providerReceivedAt: 100,
                providerSentAt: 105,
                promptId: 'test-prompt',
                isFirstMessage: true,
            },
        });
        
        await waitFor(() => {
            expect(postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RovoDevViewResponseType.ReportFirstChunkRendered,
                    promptId: 'test-prompt',
                })
            );
        });
    });
    
    it('should calculate drift metrics correctly', async () => {
        // Test drift calculations
        const providerReceivedAt = 100;
        const providerSentAt = 105;
        const reactReceivedAt = 110;
        const reactRenderedAt = 125;
        
        const expectedDrift = {
            providerToReactDriftMs: 5,  // 110 - 105
            reactRenderTimeMs: 15,      // 125 - 110
            totalDriftMs: 25,           // 125 - 100
        };
        
        // ... assertion logic
    });
    
});
```

### Integration Tests

**File:** `e2e/scenarios/rovo-dev/analytics.spec.ts` (new file)

```typescript
describe('Rovo Dev Analytics', () => {
    test('should fire first chunk rendered event', async ({ page }) => {
        const analyticsEvents: any[] = [];
        
        // Intercept analytics calls
        await page.route('**/analytics/**', (route) => {
            analyticsEvents.push(route.request().postDataJSON());
            route.fulfill({ status: 200 });
        });
        
        // Send a prompt
        await page.getByLabel('prompt-input').fill('Hello world');
        await page.getByLabel('send').click();
        
        // Wait for response
        await page.waitForSelector('.chat-message.agent-message');
        
        // Verify analytics event was fired
        const firstChunkEvent = analyticsEvents.find(
            e => e.event === 'rovoDevFirstChunkRendered'
        );
        
        expect(firstChunkEvent).toBeDefined();
        expect(firstChunkEvent.attributes.totalDriftMs).toBeGreaterThan(0);
    });
});
```

---

## Rollout Plan

### Phase 1: Dark Launch (Week 1)
- Implement all code changes
- Send events but don't analyze yet
- Verify events are flowing correctly
- Monitor for performance impact

### Phase 2: Validation (Week 2)
- Analyze sample data
- Validate drift metrics make sense
- Compare provider-side vs React-side timings
- Fix any issues discovered

### Phase 3: Full Rollout (Week 3)
- Enable for all users
- Create dashboards
- Set up alerts for anomalies
- Document findings

### Phase 4: Optimization (Week 4+)
- Identify bottlenecks from data
- Optimize slow rendering paths
- Reduce drift where possible
- Report improvements

---

## Success Metrics

### Immediate (Week 1-2)
- ✅ Events successfully captured for 95%+ of prompts
- ✅ No performance degradation (< 1ms overhead)
- ✅ Data quality validated (no NaN, negative values)

### Short-term (Month 1)
- 📊 Baseline metrics established
- 📊 Drift breakdown understood
- 📊 Bottlenecks identified

### Long-term (Month 3+)
- 🎯 Reduce p95 total drift by 20%
- 🎯 Improve perceived responsiveness score

---

## Alternative Approaches Considered

### 1. Server-Side Timing Only
**Pros:** Simpler, no React changes needed  
**Cons:** Doesn't measure actual user experience  
**Verdict:** ❌ Insufficient for UX optimization

### 2. User Timing API
**Pros:** Browser-native performance marks  
**Cons:** Harder to correlate with provider timing  
**Verdict:** 🤔 Could complement, but not replace

### 3. Chrome DevTools Performance API
**Pros:** Very detailed timing breakdown  
**Cons:** Only works in dev mode, too complex  
**Verdict:** ❌ Not suitable for production analytics

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation | Low | High | Extensive testing, feature flag |
| Data quality issues | Medium | Medium | Validation in dark launch |
| Breaking existing analytics | Low | High | Backward compatible changes |
| Privacy concerns | Low | Low | No PII, timing data only |

---

## Open Questions

1. **Sampling:** Should we sample events (e.g., 10%) to reduce volume?
2. **Retention:** How long to keep raw timing data?
3. **Alerting:** What thresholds should trigger alerts?
4. **Cross-tab:** How to handle multiple Rovo Dev instances?

---

## Appendix: Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Rovo Dev API                            │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼ HTTP Streaming Response
┌───────────────────────────────────────────────────────────────┐
│              RovoDevChatProvider                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ processRovoDevResponse()                               │  │
│  │                                                        │  │
│  │ t1 = performance.now()  ← Provider received           │  │
│  │ Parse message                                          │  │
│  │ t2 = performance.now()  ← Provider about to send      │  │
│  │                                                        │  │
│  │ webview.postMessage({                                  │  │
│  │   message: ...,                                        │  │
│  │   metadata: { t1, t2, promptId, isFirst }             │  │
│  │ })                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────────────┘
                │
                │ IPC (Inter-Process Communication)
                │ ⏱️  DRIFT ZONE #1: providerToReactDriftMs
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│                      React Webview                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ onMessageHandler()                                     │  │
│  │                                                        │  │
│  │ t3 = performance.now()  ← React received              │  │
│  │ setState(...)           ← Trigger re-render           │  │
│  └────────────────────────────────────────────────────────┘  │
│                 │                                             │
│                 │ React Reconciliation + Virtual DOM         │
│                 │ ⏱️  DRIFT ZONE #2: reactRenderTimeMs        │
│                 ▼                                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ useEffect(() => {                                      │  │
│  │   requestAnimationFrame(() => {                        │  │
│  │     t4 = performance.now() ← React rendered to DOM     │  │
│  │                                                        │  │
│  │     postMessage({                                      │  │
│  │       type: ReportFirstChunkRendered,                  │  │
│  │       providerReceivedAt: t1,                          │  │
│  │       providerSentAt: t2,                              │  │
│  │       reactReceivedAt: t3,                             │  │
│  │       reactRenderedAt: t4                              │  │
│  │     })                                                 │  │
│  │   })                                                   │  │
│  │ }, [firstChunkMetadata])                               │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
           ↓
       👀 User Sees Content
```

### Timing Breakdown

- **t1 (providerReceivedAt):** When provider receives data from API
- **t2 (providerSentAt):** When provider sends message to React
- **t3 (reactReceivedAt):** When React webview receives message
- **t4 (reactRenderedAt):** When React completes DOM update

### Drift Calculations

- **Provider to React Drift:** `t3 - t2` (IPC overhead)
- **React Render Time:** `t4 - t3` (React processing)
- **Total Drift:** `t4 - t1` (Complete overhead from provider receipt to UI render)

---

## Summary

This proposal adds comprehensive tracking of React-side rendering performance, enabling us to:

1. **Measure true user-perceived latency** (not just API response time)
2. **Identify bottlenecks** in the rendering pipeline
3. **Detect performance regressions** early
4. **Optimize the right things** based on data

The implementation is:
- ✅ **Minimally invasive** (small code changes)
- ✅ **Performant** (< 1ms overhead)
- ✅ **Backward compatible** (no breaking changes)
- ✅ **Testable** (unit + integration tests)
- ✅ **Actionable** (clear metrics for optimization)

**Next Steps:**
1. Review this proposal with the team
2. Get approval for implementation
3. Create implementation tickets
4. Begin Phase 1 (Dark Launch)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-24  
**Authors:** Analytics Team  
**Reviewers:** TBD
