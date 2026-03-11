# Proposal: Matrix / Grid Question

## Inspiration
Google Forms grid question, SurveyMonkey matrix, Qualtrics matrix table. A matrix
presents multiple row items rated on the same column scale in a compact table layout.
It is one of the most common formats in academic surveys (Big Five personality, STAI
anxiety scale, SUS usability scale).

## Problem

Researchers currently must create one Likert-scale component per item, resulting in
verbose screen definitions and a poor participant experience (items appear vertically
stacked, disconnected from their shared scale). There is no way to express "rate each
of these 10 items on the same 5-point scale" in a single component.

---

## Proposed Design

### 1. New component type: `matrix`

```ts
// lib/components/response.ts

export interface MatrixComponent extends BaseResponseComponent<"matrix", {
  dataKey: string;          // base key; each row stored as dataKey.rowValue
  label?: string;           // optional table caption
  rows: Array<{ label: string; value: string }>;
  columns: Array<{ label: string; value: string }>;  // the shared scale
  required?: boolean;
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  /** "radio" = one column per row (default), "checkbox" = multiple allowed */
  selectionMode?: "radio" | "checkbox";
}> {}
```

Each row × column intersection is a selectable cell. Submitted data shape:

```ts
// dataKey = "big5", row.value = "extraversion", column.value = "4"
// → data["big5"]["extraversion"] = "4"
// Or with checkbox mode:
// → data["big5"]["extraversion"] = ["2", "4"]
```

### 2. React component — `Matrix.tsx`

```tsx
// src/components/response/Matrix.tsx

export function Matrix({ component, form, context }: Props) {
  const { dataKey, rows, columns, selectionMode = "radio" } = component.props;
  const displayRows = useMemo(
    () => component.props.randomizeRows ? shuffle([...rows]) : rows,
    [rows],
  );

  return (
    <table role="grid" aria-label={resolveString(component.props.label ?? "", context)}>
      <thead>
        <tr>
          <th scope="col" /> {/* row label column */}
          {columns.map((col) => (
            <th key={col.value} scope="col">{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row) => (
          <tr key={row.value}>
            <th scope="row">{row.label}</th>
            {columns.map((col) => (
              <td key={col.value}>
                <input
                  type={selectionMode === "radio" ? "radio" : "checkbox"}
                  {...form.register(`${dataKey}.${row.value}`)}
                  value={col.value}
                  aria-label={`${row.label} – ${col.label}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 3. Schema validation

For `required` matrix, every row must have a selection:

```ts
// lib/schema.ts — buildSchema case for "matrix"

const rowSchemas = rows.reduce((acc, row) => {
  acc[row.value] = required
    ? z.string({ required_error: "Please rate this item" })
    : z.string().optional();
  return acc;
}, {} as Record<string, z.ZodTypeAny>);

schema[dataKey] = z.object(rowSchemas);
```

### 4. Usage example — SUS usability scale

```ts
{
  componentFamily: "response",
  template: "matrix",
  props: {
    dataKey: "sus",
    label: "Please rate your agreement with each statement",
    required: true,
    rows: [
      { label: "I would like to use this system frequently",  value: "q1" },
      { label: "I found the system unnecessarily complex",     value: "q2" },
      { label: "I thought the system was easy to use",        value: "q3" },
      // ...
    ],
    columns: [
      { label: "Strongly disagree", value: "1" },
      { label: "Disagree",          value: "2" },
      { label: "Neutral",           value: "3" },
      { label: "Agree",             value: "4" },
      { label: "Strongly agree",    value: "5" },
    ],
  },
}
```

### 5. Accessibility

- Use `<table role="grid">` with proper `scope="row"` and `scope="col"` headers.
- Each cell `<input>` has an `aria-label` combining row and column labels.
- On mobile, the table collapses to a stacked per-row Likert layout
  (controlled via CSS media query or a `mobileLayout: "stacked"` prop).

---

## Affected Files

| File | Change |
|------|--------|
| `lib/components/response.ts` | Add `MatrixComponent` type |
| `lib/schema.ts` | `buildSchema` case for `"matrix"` |
| `src/components/response/Matrix.tsx` | New component |
| `src/Screen.tsx` | Register `matrix` in the component renderer |
| `lib/specs/Screen.matrix.test.tsx` | New test suite |

---

## Open Questions

- Should `selectionMode: "checkbox"` be deferred to a later iteration to keep the first
  implementation simple?
- How should the mobile stacked layout be triggered — media query (CSS-only) or a JS
  breakpoint? The latter makes testing easier.
- For very large matrices (20+ rows), should virtual scrolling be considered?
