# Component Library Browser

> **Status:** Draft
> **Author:** —
> **Created:** 2026-03-12
> **Last updated:** 2026-03-12
> **Linked issue:** —

---

## 1. Summary

Add a `/components` route that renders every available screen component type as a live, interactive example alongside its minimal TypeScript config snippet — a lightweight in-app component reference that lets researchers see and interact with components before adding them to a screen.

---

## 2. Problem Statement

**Current state:** Component documentation lives only in `docs/components.md` — a static Markdown file listing types and props. A researcher adding a `likert-scale` to a screen must read the Markdown, mentally construct the config object, add it, and refresh the page to see what it looks like. There is no way to see a rendered, interactive example of any component without adding it to the experiment config first.

**Desired state:** A developer-facing `/components` route renders all 20+ component types as live, interactive examples. Each example shows the rendered component above the minimal TypeScript config snippet needed to produce it. Response components are wrapped in a real `react-hook-form` context so the researcher can interact with them (type in text inputs, drag sliders, select radio options).

**Impact:** Researchers learning the system must context-switch between the Markdown docs and the TypeScript config repeatedly. There is no discovery mechanism — a researcher cannot browse available components to find what fits their use case. This slows down screen authoring and leads to misuse of component types.

---

## 3. User Story

> As a **researcher authoring a new experiment screen**,
> I want to **browse available components interactively**,
> so that **I can find the right component type and copy its config without guessing at prop values**.

### Scenario A – Discovering the likert scale

A researcher opens `/components`, sees the `likert-scale` example with a 5-point scale rendered live, interacts with it, and copies the config snippet to use in their screen.

### Scenario B – Comparing radio vs dropdown

A researcher is unsure whether to use `radio` or `dropdown`. They view both side by side on the `/components` page, see how each renders on mobile width, and choose `radio` because it shows all options at once.

### Scenario C – Checking slider validation props

A researcher wants to use `requiresInteraction` on a slider. They open the slider example, see the prop documented inline, and understand exactly what config to write.

---

## 4. Acceptance Criteria

- [ ] A `/components` route exists, accessible in dev mode.
- [ ] All component families are shown in sections: `content`, `response`, `layout`, `control`.
- [ ] Every component type within each family has at least one example.
- [ ] Each example shows: the rendered component, a code block with the minimal TypeScript config, and a prop table.
- [ ] Response component examples are wrapped in a working `react-hook-form` context so participants can interact with them live.
- [ ] Clicking the "Copy config" button copies the TypeScript config snippet to the clipboard.
- [ ] The page is searchable — a text input at the top filters examples by component name or prop name.
- [ ] The route is dev-only (same guard as `/editor` and `/preview`).

---

## 5. UI / UX

### 5.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  Component Library                 [Search...]        │
├──────────────────────────────────────────────────────┤
│  Content ─────────────────────────────────────────── │
│  [ rich-text ] [ image ] [ video ] [ audio ]         │
│                                                      │
│  Response ────────────────────────────────────────── │
│  [ slider ] [ single-checkbox ] [ text-input ] ...   │
│                                                      │
│  Layout ──────────────────────────────────────────── │
│  [ button ] [ group ]                                │
│                                                      │
│  Control ─────────────────────────────────────────── │
│  [ conditional ] [ for-each ]                        │
└──────────────────────────────────────────────────────┘
```

### 5.2 Component Card

Each card layout:

```
┌─────────────────────────────────────────────┐
│  slider                         [Copy config]│  ← Name + action
├─────────────────────────────────────────────┤
│                                             │
│  How anxious do you feel?                   │  ← Live rendered component
│  ○────────────────●──────────── ○           │
│  Not at all              Extremely          │
│                                             │
├─────────────────────────────────────────────┤
│  ```ts                                      │  ← Config snippet
│  {                                          │
│    componentFamily: "response",             │
│    template: "slider",                      │
│    props: {                                 │
│      dataKey: "anxiety",                    │
│      label: "How anxious do you feel?",     │
│      min: 0, max: 100,                      │
│      minLabel: "Not at all",                │
│      maxLabel: "Extremely",                 │
│    }                                        │
│  }                                          │
│  ```                                        │
├─────────────────────────────────────────────┤
│  Props ──────────────────────────────────── │
│  dataKey       string    required           │
│  label         string    required           │
│  min           number    optional  default 0│
│  ...                                        │
└─────────────────────────────────────────────┘
```

### 5.3 States

| State | Description |
|---|---|
| Default | All components shown grouped by family. |
| Search active | Only components matching the query are shown; families with no matches are hidden. |
| Interacted | Response component reflects the current form state (slider position, selected option). |

### 5.4 Copy

| Location | String |
|---|---|
| Page title | `"Component Library"` |
| Search placeholder | `"Search components..."` |
| Copy button | `"Copy config"` |
| Copy success | `"Copied!"` (shown for 1.5s) |

### 5.5 Figma Reference

- [ ] Figma link: Not yet designed.
- [ ] Reference: Radix UI themes documentation as a UX reference for component browsers.

---

## 6. Technical Notes

### 6.1 Affected Areas

- `app/components/page.tsx` — new route
- `src/components-library/` — new directory
  - `ComponentCard.tsx` — renders a single component example
  - `ComponentCardForm.tsx` — `react-hook-form` wrapper for response components
  - `exampleConfigs.ts` — static map of `template → example ScreenComponent config`

### 6.2 Data / State

**`exampleConfigs.ts`** is a static file that exports one representative `ScreenComponent` config per template:

```ts
export const examples: Record<string, ScreenComponent> = {
  "slider": {
    componentFamily: "response",
    template: "slider",
    props: {
      dataKey: "anxiety",
      label: "How anxious do you feel right now?",
      min: 0, max: 100,
      minLabel: "Not at all", maxLabel: "Extremely",
      showValue: true,
    }
  },
  // ... one entry per template
};
```

**Rendering a response component:**

Each response component card wraps the example in a `useForm`-based context matching how `Screen.tsx` uses them, but with a no-op submit:

```tsx
function ComponentCardForm({ component }: { component: ResponseComponent }) {
  const form = useForm({
    defaultValues: buildDefaultValues({ components: [component] }),
  });
  return (
    <form>
      <RenderComponent component={component} form={form} context={{}} isLoading={false} />
    </form>
  );
}
```

No `zodResolver` is needed on the preview form — validation feedback is out of scope for the browser (it's a reference tool, not a test harness).

**Prop table generation:** The prop table for each component is derived statically from the TypeScript interface — either hand-authored in `exampleConfigs.ts` as metadata, or auto-generated via a build-time script that reads `lib/components/`.

**Copy config:** The code snippet is the JSON-serialized version of the example config formatted as TypeScript. A `navigator.clipboard.writeText(snippet)` call handles the copy.

### 6.3 Validation

No `validateExperiment` changes.

### 6.4 Constraints & Risks

- Response components use `react-hook-form` `register` and `Controller` internally. They require a `form` prop (the `UseFormReturn` object). `ComponentCardForm` provides this — no changes to the existing components are needed.
- The `for-each` and `conditional` control components require a `renderChild` callback from `RenderComponent`. The library page's `ComponentCard` for these two should show a static screenshot/mockup rather than a live interactive example, to avoid the recursive render complexity. Alternatively, a simplified inline example with hardcoded children can be used.
- The code snippet in the card is TypeScript-formatted JSON, not an actual `import` statement. If the researcher copies it directly into their config file, it will work as-is (the config format is already pure TypeScript object literals). The `componentFamily` and `template` fields are the only required identifiers.

---

## 7. Test Plan

### 7.1 Unit Tests

- [ ] `exampleConfigs` contains one entry for every `template` value defined in `lib/components/`.
- [ ] Every example config passes `buildFieldSchema` without throwing (for response components).

### 7.2 Manual / QA Checks

- [ ] Open `/components` — all 20+ component types are shown.
- [ ] Interact with a `slider` example — thumb moves, value updates.
- [ ] Click "Copy config" on a `radio` example — clipboard contains valid TypeScript config.
- [ ] Search "text" — `text-input`, `text-area`, and `rich-text` are shown; others are hidden.

---

## 8. Out of Scope

- Editing component props on the page (the card is read-only).
- Testing validation rules in the browser (e.g., triggering `required` errors).
- Generating the prop table automatically from TypeScript source (hand-authored for now).
- Showing multiple examples per component (e.g., a `slider` with `requiresInteraction`).

---

## 9. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should the component browser be linked from the visual flow builder's screen editor panel? | — | Open — natural integration point once the editor exists. |
| 2 | Should prop tables be hand-authored or generated from TypeScript interfaces at build time? | — | Open — hand-authored is simpler initially; auto-generation prevents docs from drifting. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-03-12 | — | Initial draft |
