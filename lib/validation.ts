import { z } from "zod";
import { FrameworkScreen } from "./screen";
import { ResponseComponent } from "./components/response";

function buildFieldSchema(component: ResponseComponent): z.ZodTypeAny {
  const { required = true, errorMessage } = component.props;
  const msg = errorMessage ?? "This field is required";

  switch (component.template) {
    case "text-input":
    case "text-area": {
      const { minLength, maxLength, pattern } = component.props;
      let base = z.string();
      if (required) base = base.min(1, msg);
      if (minLength)
        base = base.min(
          minLength.value,
          minLength.errorMessage ??
            `Must be at least ${minLength.value} characters`,
        );
      if (maxLength)
        base = base.max(
          maxLength.value,
          maxLength.errorMessage ??
            `Must be at most ${maxLength.value} characters`,
        );
      if (pattern)
        base = base.regex(
          new RegExp(pattern.value),
          pattern.errorMessage ?? "Invalid format",
        );
      return required ? base : base.optional();
    }

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
        base = base.min(
          min ?? 1,
          errorMessage ??
            (min !== undefined && min > 1
              ? `Select at least ${min} options`
              : "Please select at least one option"),
        );
      }
      if (max !== undefined) {
        base = base.max(max, errorMessage ?? `Select at most ${max} options`);
      }
      return base;
    }

    case "likert-scale": {
      const base = z.string();
      return required ? base.min(1, msg) : base.optional();
    }

    case "numeric-input": {
      const { min, max } = component.props;
      let base = z.coerce.number();
      if (min !== undefined)
        base = base.min(min, errorMessage ?? `Must be at least ${min}`);
      if (max !== undefined)
        base = base.max(max, errorMessage ?? `Must be at most ${max}`);
      return required ? base : base.optional();
    }

    case "slider": {
      const {
        min = 0,
        max = 100,
        requiresInteraction,
        minValue,
        maxValue,
      } = component.props;
      let base = z.coerce.number().min(min).max(max);
      if (minValue)
        base = base.min(
          minValue.value,
          minValue.errorMessage ?? `Must be at least ${minValue.value}`,
        );
      if (maxValue)
        base = base.max(
          maxValue.value,
          maxValue.errorMessage ?? `Must be at most ${maxValue.value}`,
        );
      if (requiresInteraction) {
        // Validate raw value first: z.coerce.number() silences NaN with its own message.
        return z
          .any()
          .refine(
            (v) =>
              component.template !== "slider" ||
              (v !== undefined && v !== null && Number.isFinite(Number(v))),
            {
              message:
                requiresInteraction.errorMessage ??
                "Please interact with the slider",
            },
          )
          .transform(Number);
      }
      return base;
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

export function buildSchema(
  screen: FrameworkScreen,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const component of screen.components) {
    if (component.componentFamily !== "response") continue;
    shape[component.props.dataKey] = buildFieldSchema(component);
  }

  return z.object(shape);
}
