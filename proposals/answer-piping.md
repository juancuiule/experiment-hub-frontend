# Proposal: Answer Piping

## Inspiration

Typeform, Qualtrics, SurveyMonkey — all let you insert a previous answer directly into a later question's text. "Hi {{name}}, how did you find {{company}}?" feels personal and keeps participants engaged in long flows.

## Problem

The `$$` prefix in `resolveValuesInString` already does basic data lookups, but it has limitations for piping use cases:

- It only reads raw stored values — no formatting (capitalize, round to 2 decimal places, join array as readable list).
- It silently leaves the placeholder text in if the key is missing, which looks broken to participants.
- There is no way to define a named alias for a deeply nested path that is reused across many screens.

---

## Proposed Design

### 1. Pipe variables — named aliases defined on the flow

```ts
// lib/types.ts

export type PipeVariable = {
  name: string; // referenced as {{name}} in text
  source: `$$${string}` | `@${string}` | `$${string}`;
  format?: "capitalize" | "uppercase" | "lowercase" | "number" | "list";
  fallback?: string; // shown when source resolves to undefined
};

export type ExperimentFlow = {
  // ...existing fields...
  pipes?: PipeVariable[];
};
```

### 2. Double-brace syntax in strings

Add `{{pipeName}}` alongside the existing `$$key` / `@key` / `$key` tokens:

```ts
// lib/resolve.ts

export function resolveValuesInString(
  text: string,
  context: Context,
  pipes: PipeVariable[] = [],
): string {
  // Existing $$ and @ substitutions
  let result = text.replace(
    /(\$\$[\w.-]+|@[\w.]+|#[\w.]+|\$[\w.]+)/g,
    (match) => {
      const resolved = getValue(context, match as any);
      return resolved != null ? String(resolved) : match;
    },
  );

  // New pipe substitutions
  result = result.replace(/\{\{([\w]+)\}\}/g, (match, name) => {
    const pipe = pipes.find((p) => p.name === name);
    if (!pipe) return match;
    const raw = getValue(context, pipe.source);
    if (raw == null) return pipe.fallback ?? match;
    return applyFormat(raw, pipe.format);
  });

  return result;
}

function applyFormat(value: any, format?: PipeVariable["format"]): string {
  const str = Array.isArray(value) ? value.join(", ") : String(value);
  switch (format) {
    case "capitalize":
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    case "uppercase":
      return str.toUpperCase();
    case "lowercase":
      return str.toLowerCase();
    case "number":
      return Number(value).toLocaleString();
    case "list":
      return Array.isArray(value) ? value.join(", ") : str;
    default:
      return str;
  }
}
```

### 3. Usage example

```ts
// Experiment flow definition
pipes: [
  {
    name: "firstName",
    source: "$$welcome.name",
    format: "capitalize",
    fallback: "there",
  },
  { name: "sport", source: "@value" },
];

// In a screen component label:
("Hi {{firstName}}, how often do you play {{sport}}?");
// Renders: "Hi Juan, how often do you play Soccer?"
```

### 4. Validator additions

- `pipe-name-collision` — two pipes share the same name
- `pipe-unknown-source` — source key references a screen slug that doesn't exist in the flow
- `pipe-used-but-undefined` — `{{name}}` appears in a label but no pipe with that name is declared

---

## Affected Files

| File                        | Change                                      |
| --------------------------- | ------------------------------------------- |
| `lib/types.ts`              | Add `PipeVariable`, extend `ExperimentFlow` |
| `lib/resolve.ts`            | Handle `{{name}}` syntax, `applyFormat`     |
| `lib/validate.ts`           | Three new validation codes                  |
| `lib/specs/resolve.test.ts` | New pipe substitution tests                 |

---

## Open Questions

- Should `format: "list"` support a custom separator (e.g., Oxford comma)?
- Should pipes be scoped per-screen or global to the flow?
- Should the `$$` / `@` raw syntax be deprecated in favor of `{{pipeName}}` for all
  label text to keep a single interpolation surface?
