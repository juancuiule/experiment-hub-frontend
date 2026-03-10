import { z } from "zod";
import { FrameworkScreen } from "./screen";
import { ResponseComponent } from "./components/response";

function buildFieldSchema(component: ResponseComponent): z.ZodTypeAny {
  const { required, errorMessage } = component.props;
  const msg = errorMessage ?? "This field is required";

  switch (component.template) {
    case "text-input":
    case "date-input":
    case "time-input": {
      const base = z.string();
      return required ? base.min(1, msg) : base.optional();
    }

    case "dropdown":
    case "radio": {
      const base = z.string();
      return required ? base.min(1, msg) : base.optional();
    }

    case "checkboxes": {
      const { min, max } = component.props;
      let base = z.array(z.string());
      if (required || (min !== undefined && min > 0)) {
        base = base.min(min ?? 1, errorMessage ?? (min !== undefined && min > 1 ? `Select at least ${min} options` : "Please select at least one option"));
      }
      if (max !== undefined) {
        base = base.max(max, errorMessage ?? `Select at most ${max} options`);
      }
      return base;
    }

    case "rating": {
      const base = z.coerce.number().int().min(1, errorMessage ?? "Please select a rating").max(component.props.max);
      return required ? base : base.optional();
    }

    case "slider": {
      const { min = 0, max = 100 } = component.props;
      // Slider always has a value (range input) — only coerce to number
      return z.coerce.number().min(min).max(max);
    }

    case "single-checkbox": {
      const { shouldBe } = component.props;
      if (shouldBe !== undefined) {
        return z.boolean().refine((v) => v === shouldBe, {
          message: errorMessage ?? `Must be ${shouldBe}`,
        });
      }
      return required
        ? z.boolean().refine((v) => v === true, { message: msg })
        : z.boolean();
    }
  }
}

export function buildSchema(screen: FrameworkScreen): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const component of screen.components) {
    if (component.componentFamily !== "response") continue;
    shape[component.props.dataKey] = buildFieldSchema(component);
  }

  return z.object(shape);
}
