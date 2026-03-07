import { getValue } from "./conditions";
import { Context } from "./types";

export function resolveValuesInString(text: string, context: Context): string {
  return text.replace(/(\$\$[\w.-]+|@[\w.]+)/g, (match) => {
    const key = match as `$$${string}` | `@${string}`;
    const resolved = getValue(context, key);
    return resolved != null ? String(resolved) : match;
  });
}
