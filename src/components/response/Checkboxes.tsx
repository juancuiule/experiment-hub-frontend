"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Controller, UseFormReturn } from "react-hook-form";
import { CheckboxesComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import {
  CheckIcon,
  checkboxBase,
  FieldError,
  resolveOptions,
  resolveString,
} from "../primitives";

type Props = {
  component: CheckboxesComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function Checkboxes({ component, form, context }: Props) {
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
          <label>{resolveString(component.props.label, context)}</label>
          <div className="flex flex-col gap-2 mt-2">
            {resolveOptions(component.props.options, context).map((opt) => {
              const checked =
                Array.isArray(field.value) && field.value.includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center gap-2">
                  <CheckboxPrimitive.Root
                    id={`${dataKey}-${opt.value}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const current = Array.isArray(field.value)
                        ? field.value
                        : [];
                      field.onChange(
                        isChecked
                          ? [...current, opt.value]
                          : current.filter((v: string) => v !== opt.value),
                      );
                    }}
                    className={checkboxBase}
                  >
                    <CheckboxPrimitive.Indicator>
                      <CheckIcon />
                    </CheckboxPrimitive.Indicator>
                  </CheckboxPrimitive.Root>
                  <label
                    className="text-sm"
                    htmlFor={`${dataKey}-${opt.value}`}
                  >
                    {opt.label}
                  </label>
                </div>
              );
            })}
          </div>
          <FieldError
            message={errors[dataKey]?.message as string | undefined}
          />
        </div>
      )}
    />
  );
}
