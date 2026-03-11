# Proposal: First-Class Consent and Debrief Nodes

## Inspiration
Every IRB-approved study requires informed consent before data collection and a debrief
after. Gorilla SC has dedicated consent and debrief task types. Qualtrics has consent
logic built into its distribution settings. Currently researchers must simulate these
with generic screens and manual branching, which is error-prone and hard to audit.

## Problem

- Consent is currently a regular screen with no semantic meaning to the engine. There is
  no way to guarantee that data collection only begins after consent is recorded.
- If a participant does not consent, there is no standardized way to terminate the flow
  and exclude their data.
- The debrief screen has no special status — it can be skipped by a bad edge definition.
- Compliance teams and IRBs cannot easily audit a flow definition to confirm consent is
  properly placed.

---

## Proposed Design

### 1. `consent` node type

```ts
// lib/nodes.ts

export interface ConsentNode extends BaseNode<"consent"> {
  props: {
    name: string;
    /** The screen slug containing the consent form components. */
    screenSlug: string;
    /** The dataKey of the checkbox/radio component the participant uses to agree. */
    consentKey: string;
    /** Value that represents agreement (default: "true" or true). */
    agreedValue?: string | boolean;
    /** Node to route to if the participant declines. */
    declineNodeId: string;
    /** ISO 8601 timestamp of the IRB approval this consent covers. */
    irbApprovalDate?: string;
    /** Version string for the consent text (increment when text changes). */
    consentVersion: string;
  };
}
```

### 2. Engine behavior

When the engine reaches a `consent` node:
1. It renders the consent screen (same mechanism as any screen node).
2. On submission, it checks `data[consentKey] === agreedValue`.
3. If agreed: records `context.consent = { agreed: true, version, timestamp }` and continues.
4. If declined: routes to `declineNodeId` and sets `context.consent = { agreed: false }`.

No data is written to `context.data` before consent is recorded (enforced by the engine).

### 3. `debrief` node type

```ts
export interface DebriefNode extends BaseNode<"debrief"> {
  props: {
    name: string;
    /** The screen slug containing the debrief text. */
    screenSlug: string;
    /** If true, this is the terminal node — no edges out are needed. */
    terminal?: boolean;
  };
}
```

A `debrief` node must be reachable from all non-decline terminal paths. The validator
checks that every flow path that starts with a `consent` node reaches a `debrief` node.

### 4. Extend `Context` with consent metadata

```ts
// lib/types.ts

// Extend Context:
consent?: {
  agreed: boolean;
  version: string;
  timestamp: string;  // ISO 8601
};
```

`context.consent` is included in every `send()` call, giving the backend an
authoritative record of agreement.

### 5. Withdrawal support

Participants have the right to withdraw at any time (GDPR, APA Ethics Code). A
`withdraw()` function clears `context.data` and routes to the debrief:

```ts
// lib/flow.ts
export async function withdraw(step: FlowStep): Promise<FlowStep> {
  const clearedContext = {
    ...step.context,
    data: {},           // erase collected data
    consent: { ...step.context.consent, withdrawn: true, withdrawnAt: new Date().toISOString() },
  };
  await send(clearedContext);  // notify backend of withdrawal
  // Route to the debrief node
  const debriefNode = step.experiment.nodes.find((n) => n.type === "debrief");
  if (!debriefNode) return { ...step, state: { type: "end" }, context: clearedContext };
  return enterStep({ state: initialState(step.experiment, clearedContext, debriefNode), ... });
}
```

### 6. Validator additions

- `consent-missing` — flow has no `consent` node (warning, not error, for non-IRB uses)
- `consent-no-decline-route` — `declineNodeId` not found in nodes
- `consent-before-data` — a screen node appears before the consent node (data collected before consent)
- `debrief-unreachable` — at least one terminal path does not pass through a `debrief` node

### 7. Audit export

```ts
// lib/compliance.ts

export function auditConsentChain(flow: ExperimentFlow): {
  consentNode: ConsentNode | null;
  debriefReachable: boolean;
  dataBeforeConsent: string[];  // node IDs of screens before consent
  irbApprovalDate: string | null;
  consentVersion: string | null;
}
```

---

## Affected Files

| File | Change |
|------|--------|
| `lib/nodes.ts` | Add `ConsentNode`, `DebriefNode` |
| `lib/types.ts` | Extend `Context` with `consent` |
| `lib/flow.ts` | Handle `consent` and `debrief` in `traverseInNode`; add `withdraw()` |
| `lib/validate.ts` | Four new validation codes |
| `lib/compliance.ts` | New file: `auditConsentChain` |
| `lib/specs/flow/flow.consent.test.ts` | New test suite |

---

## Open Questions

- Should `consent` be a node type or a flow-level property
  (`flow.consent: { required: true, ... }`)?
- Should re-consent be required when `consentVersion` changes mid-deployment?
- Should the engine enforce the "no data before consent" rule strictly (throw) or
  softly (validator warning)?
