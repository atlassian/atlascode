# Rovo Dev Chat Analytics Documentation

## Overview
This document describes the analytics instrumentation for key user interactions in the Rovo Dev chat feature.

## Analytics Events Summary

### 1. User Sees Rovo Dev Chat with Invalid Auth

**Status:** ❌ **No analytics event tracked**

**Technical Details:**
- **State Management:** When auth is invalid, the application state changes to `Disabled` with subState `UnauthorizedAuth` or `NeedAuth`
  - Defined in: `src/rovo-dev/rovoDevTypes.ts` (lines 81-92)
  - State change handled in: `src/rovo-dev/ui/rovoDevView.tsx` (lines 362-376)
- **UI Component:** `DisabledMessage.tsx` displays appropriate auth prompts
  - Location: `src/rovo-dev/ui/landing-page/disabled-messages/DisabledMessage.tsx`
  - Shows "Add API Token" button for `NeedAuth` (lines 18-26)
  - Shows "Auth settings" button for `UnauthorizedAuth` (lines 29-41)

**Gap:** No analytics event is fired when the user views the disabled state with invalid auth.

**Potential Event Structure:**
```typescript
rovoDevInvalidAuthViewed(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    subState: 'NeedAuth' | 'UnauthorizedAuth'
)
```

---

### 2. User Has Text in the Prompt Box

**Status:** ❌ **No analytics event tracked**

**Technical Details:**
- **Component:** `PromptInput.tsx` manages the prompt input using Monaco editor
  - Location: `src/rovo-dev/ui/prompt-box/prompt-input/PromptInput.tsx`
  - Uses Monaco editor for rich text editing with slash commands
- **Text Management:** Text is stored in editor state but not instrumented
  - Editor created via `createMonacoPromptEditor()` utility
  - No onChange or input event handlers that track analytics

**Gap:** No instrumentation for:
- User typing in the prompt box
- Text length or character count
- Time spent typing
- Prompt box focus/blur events

**Potential Event Structure:**
```typescript
rovoDevPromptTextChanged(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    textLength: number,
    hasContext: boolean
)
```

---

### 3. User Sends a Message

**Status:** ✅ **Analytics event tracked**

**Event Name:** `rovoDevPromptSent`

**Implementation:**
```typescript
// File: src/rovo-dev/analytics/rovodevAnalyticsApi.ts (lines 41-51)
export function rovoDevPromptSentEvent(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    deepPlanEnabled: boolean,
) {
    return trackEvent('rovoDevPromptSent', 'atlascode', {
        attributes: { rovoDevEnv, appInstanceId, sessionId, promptId, deepPlanEnabled },
    });
}
```

**Trigger Point:**
- File: `src/rovo-dev/rovoDevChatProvider.ts` (lines 175-179)
- Context: After preparing the chat request payload and before processing the response

```typescript
this._telemetryProvider.fireTelemetryEvent(
    'rovoDevPromptSentEvent',
    this._currentPromptId,
    !!requestPayload.enable_deep_plan,
);
```

**Attributes Tracked:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `rovoDevEnv` | `'IDE' \| 'Boysenberry'` | Environment where Rovo Dev is running |
| `appInstanceId` | `string` | Unique identifier for the app instance |
| `sessionId` | `string` | Current Rovo Dev session ID |
| `promptId` | `string` | Unique ID for this specific prompt (UUID) |
| `deepPlanEnabled` | `boolean` | Whether deep planning feature was enabled |

**Flow:**
1. User clicks send button in `PromptInput.tsx` (line 268)
2. `sendPrompt()` called in `rovoDevView.tsx` (lines 473-508)
3. Message posted to provider via `RovoDevViewResponseType.Prompt`
4. Provider's `executeChat()` processes the prompt in `rovoDevChatProvider.ts`
5. Analytics event fired before API call

---

### 4. User Sees First Message Chunk (React Side)

**Status:** ⚠️ **Partial tracking (provider-side only)**

**Provider-Side Event:** `timeToFirstMessage` (performance event)

**Implementation:**
```typescript
// File: src/rovo-dev/performanceLogger.ts (lines 43-58)
public async promptFirstMessageReceived(promptId: string) {
    const measure = Perf.measure(promptId);
    const evt = await this.extensionApi.analytics.performanceEvent(
        'api.rovodev.chat.response.timeToFirstMessage',
        measure,
        {
            rovoDevEnv: this.rovoDevEnv,
            appInstanceId: this.appInstanceId,
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        },
    );
    
    RovoDevLogger.debug(`Event fired: rovodev.response.timeToFirstMessage ${measure} ms`);
    await this.extensionApi.analytics.sendTrackEvent(evt);
}
```

**Trigger Point:**
- File: `src/rovo-dev/rovoDevChatProvider.ts` (lines 319-322)
- Context: When parsing the first message from the streaming response

```typescript
if (isFirstMessage) {
    telemetryProvider?.perfLogger.promptFirstMessageReceived(this._currentPromptId);
    isFirstMessage = false;
}
```

**React-Side Processing:**
- Messages received via `RovoDevProviderMessageType.RovoDevResponseMessage` in `rovoDevView.tsx` (lines 256-271)
- Appended to history using `appendResponse()` function in `utils.tsx` (lines 319-402)
- Streaming text chunks concatenated (lines 344-347):
  ```typescript
  if (latest?.event_kind === 'text' && response?.event_kind === 'text') {
      const appendedMessage = { ...latest, content: latest.content + response.content };
      return [...prev, appendedMessage];
  }
  ```

**Gap:** No analytics event when React UI actually renders the first chunk to the user.

**What's Tracked:**
- ✅ Time from prompt sent to first message received by provider (network + processing time)
- ❌ Time from first message received to first render in UI
- ❌ User visibility/viewport intersection

**Potential Event Structure:**
```typescript
rovoDevFirstChunkRendered(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    timeToRender: number
)
```

---

### 5. User Sees Last Message Chunk (React Side)

**Status:** ⚠️ **Partial tracking (provider-side only)**

**Provider-Side Event:** `timeToLastMessage` (performance event)

**Implementation:**
```typescript
// File: src/rovo-dev/performanceLogger.ts (lines 77-94)
public async promptLastMessageReceived(promptId: string) {
    const measure = Perf.measure(promptId);
    const evt = await this.extensionApi.analytics.performanceEvent(
        'api.rovodev.chat.response.timeToLastMessage',
        measure,
        {
            rovoDevEnv: this.rovoDevEnv,
            appInstanceId: this.appInstanceId,
            rovoDevSessionId: this.currentSessionId,
            rovoDevPromptId: promptId,
        },
    );
    
    Perf.clear(promptId);
    
    RovoDevLogger.debug(`Event fired: rovodev.response.timeToLastMessage ${measure} ms`);
    await this.extensionApi.analytics.sendTrackEvent(evt);
}
```

**Trigger Point:**
- File: `src/rovo-dev/rovoDevChatProvider.ts` (line 329)
- Context: After streaming response is complete, before flushing remaining chunks

```typescript
// last response of the stream -> fire performance telemetry event
telemetryProvider?.perfLogger.promptLastMessageReceived(this._currentPromptId);
```

**React-Side Processing:**
- React receives `RovoDevProviderMessageType.CompleteMessage` in `rovoDevView.tsx` (lines 273-284)
- State changes back to `WaitingForPrompt`
- Message marked as summary via `setSummaryMessageInHistory()` (lines 208-218)
- Pending tool call message cleared

**Gap:** No analytics event when React UI completes rendering the final chunk.

**What's Tracked:**
- ✅ Time from prompt sent to last message received by provider (total network + processing time)
- ❌ Time from last message received to final render in UI
- ❌ User scroll position when streaming completes
- ❌ Whether user scrolled away during streaming

**Potential Event Structure:**
```typescript
rovoDevLastChunkRendered(
    rovoDevEnv: RovoDevEnv,
    appInstanceId: string,
    sessionId: string,
    promptId: string,
    timeToRender: number,
    userScrolledAway: boolean
)
```

---

## Additional Performance Events

### Other Tracked Performance Metrics

#### 1. Time to First Byte
**Event:** `api.rovodev.chat.response.timeToFirstByte`
- **File:** `src/rovo-dev/performanceLogger.ts` (lines 26-41)
- **Trigger:** `src/rovo-dev/rovoDevChatProvider.ts` (lines 312-315)
- **Description:** Time from prompt sent to first byte received from API

```typescript
if (isFirstByte) {
    telemetryProvider?.perfLogger.promptFirstByteReceived(this._currentPromptId);
    isFirstByte = false;
}
```

#### 2. Time to Technical Plan
**Event:** `api.rovodev.chat.response.timeToTechPlan`
- **File:** `src/rovo-dev/performanceLogger.ts` (lines 60-75)
- **Trigger:** `src/rovo-dev/rovoDevChatProvider.ts` (lines 375-398)
- **Description:** Time from prompt sent to technical plan received
- **Additional Event:** `rovoDevTechnicalPlanningShown` with plan details (stepsCount, filesCount, questionsCount)

---

## Performance Event Types

All performance events use the same common parameters structure:

```typescript
type RovoDevCommonParams = {
    rovoDevEnv: RovoDevEnv;
    appInstanceId: string;
    rovoDevSessionId: string;
    rovoDevPromptId: string;
};
```

**Performance Event Constants:**
```typescript
// File: src/rovo-dev/analytics/rovodevAnalyticsTypes.ts (lines 2-9)
export const RovoDevPerfEvents = {
    timeToFirstByte: 'api.rovodev.chat.response.timeToFirstByte',
    timeToFirstMessage: 'api.rovodev.chat.response.timeToFirstMessage',
    timeToTechPlan: 'api.rovodev.chat.response.timeToTechPlan',
    timeToLastMessage: 'api.rovodev.chat.response.timeToLastMessage',
} as const;
```

---

## Architecture Overview

### Analytics Flow

```
User Action (React UI)
    ↓
rovoDevView.tsx (React Component)
    ↓
postMessage() → RovoDevViewResponse
    ↓
rovoDevWebviewProvider.ts (VSCode Provider)
    ↓
rovoDevChatProvider.ts (Chat Logic)
    ↓
rovoDevTelemetryProvider.ts (Telemetry)
    ↓
rovodevAnalyticsApi.ts (Analytics API)
    ↓
Container.analyticsClient (Analytics Client)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/rovo-dev/analytics/rovodevAnalyticsTypes.ts` | Type definitions and event constants |
| `src/rovo-dev/analytics/rovodevAnalyticsApi.ts` | Analytics event factory functions |
| `src/rovo-dev/performanceLogger.ts` | Performance timing and logging |
| `src/rovo-dev/rovoDevTelemetryProvider.ts` | Telemetry orchestration |
| `src/rovo-dev/rovoDevChatProvider.ts` | Chat logic and event triggers |
| `src/rovo-dev/ui/rovoDevView.tsx` | React UI component |

---

## Analytics Gaps and Opportunities

### Critical Gaps

1. **Invalid Auth Visibility** - No tracking when users see auth errors
   - **Impact:** Cannot measure auth failure rates or user friction
   - **Recommendation:** Add event when `DisabledState` with auth errors is rendered

2. **Prompt Box Engagement** - No tracking of user typing behavior
   - **Impact:** Cannot measure engagement or understand user intent
   - **Recommendation:** Add events for text changes, focus duration, prompt length

3. **UI Render Performance** - No tracking of React-side rendering
   - **Impact:** Cannot measure perceived performance from user perspective
   - **Recommendation:** Add events for first/last chunk render completion

### Enhancement Opportunities

1. **Scroll Behavior** - Track if users scroll away during streaming
2. **Context Usage** - Track when users add/remove context items
3. **Error Recovery** - Track how users interact with error states
4. **Cancel Actions** - Track when/why users cancel responses
5. **Retry Patterns** - Track retry after error behaviors

---

## Related Analytics Events

### Other Rovo Dev Events (from `rovodevAnalyticsApi.ts`)

| Event | Description | File Location |
|-------|-------------|---------------|
| `rovoDevNewSessionAction` | New session created | Lines 30-39 |
| `rovoDevTechnicalPlanningShown` | Technical plan displayed | Lines 53-65 |
| `rovoDevFilesSummaryShown` | File summary displayed | Lines 67-77 |
| `rovoDevFileChangedAction` | User undoes/keeps file changes | Lines 79-90 |
| `rovoDevStopAction` | User stops generation | Lines 92-102 |
| `rovoDevGitPushAction` | User pushes changes | Lines 104-114 |
| `rovoDevDetailsExpanded` | User expands thinking drawer | Lines 116-125 |
| `rovoDevCreatePrButtonClicked` | Create PR button clicked | Lines 127-136 |
| `rovoDevAiResultViewed` | User views AI result (with dwell time) | Lines 138-160 |

---

## Measurement Timing

### Performance Measurement Flow

```
User sends prompt (t0)
    ↓
Perf.mark(promptId) ← Start timer
    ↓
First byte received (t1)
    → Perf.measure(promptId) → timeToFirstByte = t1 - t0
    ↓
First message parsed (t2)
    → Perf.measure(promptId) → timeToFirstMessage = t2 - t0
    ↓
Technical plan received (if applicable) (t3)
    → Perf.measure(promptId) → timeToTechPlan = t3 - t0
    ↓
Last message parsed (t4)
    → Perf.measure(promptId) → timeToLastMessage = t4 - t0
    → Perf.clear(promptId) ← Clear timer
```

**Timer Management:**
- Start: `performanceLogger.promptStarted(promptId)` - calls `Perf.mark(promptId)`
- Measure: Each event calls `Perf.measure(promptId)` to get elapsed time
- Clear: `performanceLogger.promptLastMessageReceived()` - calls `Perf.clear(promptId)`

**Location:** `src/util/perf.ts` (referenced in `performanceLogger.ts`)

---

## Testing Considerations

### Analytics Testing

Currently, analytics are tested in:
- `src/rovo-dev/analytics/rovodevAnalyticsApi.test.ts`
- `src/rovo-dev/performanceLogger.test.ts`

**Test Coverage:**
- ✅ Event creation with correct attributes
- ✅ Performance measurement and logging
- ✅ Telemetry provider event firing
- ❌ End-to-end analytics flow from UI to backend
- ❌ React-side rendering analytics

---

## Implementation Notes

### Why React-Side Analytics Are Missing

The current architecture tracks analytics primarily at the **provider level** (VSCode extension host process), not the **webview level** (React UI process). This is because:

1. **Separation of Concerns:** Business logic and API interactions happen in the provider
2. **Performance:** Minimizes messaging between webview and provider
3. **Reliability:** Provider-side tracking is more reliable than webview tracking

However, this means **user-perceived performance** (actual rendering time) is not tracked.

### Adding React-Side Analytics

To add React-side analytics, you would need to:

1. Add timing marks when messages are received in React
2. Add timing marks when rendering completes (useEffect after DOM update)
3. Post analytics messages back to provider
4. Provider forwards to analytics client

**Example Pattern:**
```typescript
// In rovoDevView.tsx
React.useEffect(() => {
    if (firstChunkReceived) {
        postMessage({
            type: RovoDevViewResponseType.AnalyticsEvent,
            event: 'firstChunkRendered',
            promptId: currentPromptId,
            timestamp: performance.now()
        });
    }
}, [history, firstChunkReceived]);
```

---

## Appendix: State Machine

### Rovo Dev States (from `rovoDevTypes.ts`)

```typescript
type State = BasicState | InitializingState | DisabledState;

// Basic States
type BasicState = {
    state: 'WaitingForPrompt' | 'GeneratingResponse' | 
           'CancellingResponse' | 'ExecutingPlan' | 'ProcessTerminated'
};

// Initializing States
type InitializingState = {
    state: 'Initializing';
    subState: 'Other' | 'UpdatingBinaries' | 'MCPAcceptance';
    isPromptPending: boolean;
};

// Disabled States
type DisabledState = {
    state: 'Disabled';
    subState: 'NeedAuth' | 'UnauthorizedAuth' | 'NoWorkspaceOpen' | 
              'UnsupportedArch' | 'EntitlementCheckFailed' | 'Other';
};
```

### State Transitions (Analytics Opportunities)

Each state transition could be instrumented:
- `WaitingForPrompt` → `GeneratingResponse` (tracked via `rovoDevPromptSent`)
- `GeneratingResponse` → `WaitingForPrompt` (tracked via `timeToLastMessage`)
- `GeneratingResponse` → `CancellingResponse` (tracked via `rovoDevStopAction`)
- Any state → `Disabled` (NOT tracked - potential gap)

---

## Document Metadata

- **Created:** 2025-01-24
- **Source:** Code analysis of Rovo Dev analytics implementation
- **Primary Files Analyzed:**
  - `src/rovo-dev/analytics/rovodevAnalyticsApi.ts`
  - `src/rovo-dev/analytics/rovodevAnalyticsTypes.ts`
  - `src/rovo-dev/performanceLogger.ts`
  - `src/rovo-dev/rovoDevChatProvider.ts`
  - `src/rovo-dev/ui/rovoDevView.tsx`
  - `src/rovo-dev/rovoDevTypes.ts`
  - `src/rovo-dev/ui/prompt-box/prompt-input/PromptInput.tsx`
  - `src/rovo-dev/ui/landing-page/disabled-messages/DisabledMessage.tsx`

---

## Quick Reference

| Scenario | Event Tracked? | Event Name | File |
|----------|---------------|------------|------|
| Invalid auth shown | ❌ No | N/A | `DisabledMessage.tsx` |
| Text in prompt box | ❌ No | N/A | `PromptInput.tsx` |
| User sends message | ✅ Yes | `rovoDevPromptSent` | `rovodevAnalyticsApi.ts:41` |
| First chunk (provider) | ✅ Yes | `timeToFirstMessage` | `performanceLogger.ts:43` |
| First chunk (React) | ❌ No | N/A | `rovoDevView.tsx:256` |
| Last chunk (provider) | ✅ Yes | `timeToLastMessage` | `performanceLogger.ts:77` |
| Last chunk (React) | ❌ No | N/A | `rovoDevView.tsx:273` |
