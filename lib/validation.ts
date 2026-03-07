import { z } from "zod";
import { ScreenComponent } from "./screen";

function componentSchema(component: ScreenComponent): [string, z.ZodTypeAny] | null {
  switch (component.type) {
    case "input":
      return component.required
        ? [component.dataKey, z.string().min(1, "This field is required")]
        : null;
    case "checkbox-group":
      return component.required
        ? [component.dataKey, z.array(z.string()).min(1, "Please select at least one option")]
        : null;
    case "rating":
      return component.required
        ? [component.dataKey, z.preprocess((v) => v ?? "", z.string().min(1, "Please select a rating"))]
        : null;
    default:
      return null;
  }
}

export function buildSchema(components: ScreenComponent[]) {
  const shape = components.reduce<Record<string, z.ZodTypeAny>>((acc, component) => {
    const entry = componentSchema(component);
    return entry ? { ...acc, [entry[0]]: entry[1] } : acc;
  }, {});

  return z.object(shape);
}

export type FieldErrors = Record<string, string>;
