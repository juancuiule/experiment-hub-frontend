"use client";

import { UseFormReturn } from "react-hook-form";
import { NumericInputComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import { FieldError, inputBase, resolveString } from "../primitives";

type Props = {
  component: NumericInputComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function NumericInput({ component, form, context }: Props) {
  const { register, formState: { errors } } = form;
  const { dataKey } = component.props;

  return (
    <div className="my-4 flex flex-col gap-1">
      <label className="text-sm">{resolveString(component.props.label, context)}</label>
      <input
        {...register(dataKey, { valueAsNumber: true })}
        type="number"
        placeholder={component.props.placeholder}
        min={component.props.min}
        max={component.props.max}
        step={component.props.step}
        className={inputBase}
      />
      <FieldError message={errors[dataKey]?.message as string | undefined} />
    </div>
  );
}
