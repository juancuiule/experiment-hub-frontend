"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Controller, UseFormReturn } from "react-hook-form";
import { SingleCheckboxComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import {
  CheckIcon,
  checkboxBase,
  FieldError,
  resolveString,
} from "../primitives";
import { twMerge } from "tailwind-merge";

type Props = {
  component: SingleCheckboxComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function SingleCheckbox({ component, form, context }: Props) {
  const {
    control,
    formState: { errors },
  } = form;
  const { dataKey } = component.props;

  return (
    <Controller
      control={control}
      name={dataKey}
      render={({ field }) => (
        <div className="my-4 flex flex-col gap-1">
          <div className="flex items-start gap-2">
            <CheckboxPrimitive.Root
              id={`${dataKey}`}
              checked={field.value}
              onCheckedChange={field.onChange}
              className={twMerge(checkboxBase, "translate-y-0.5")}
            >
              <CheckboxPrimitive.Indicator>
                <CheckIcon />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            <label className="leading-tight" htmlFor={`${dataKey}`}>
              {resolveString(component.props.label, context)}
            </label>
          </div>
          <FieldError
            message={errors[dataKey]?.message as string | undefined}
          />
        </div>
      )}
    />
  );
}
