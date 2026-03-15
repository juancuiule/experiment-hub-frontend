"use client";

import { NumericInputComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import { UseFormReturn } from "react-hook-form";
import { Input } from "../Input";
import { Label } from "../Label";
import { FieldError } from "../primitives";

type Props = {
  component: NumericInputComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function NumericInput({ component, form, context }: Props) {
  const {
    register,
    formState: { errors },
  } = form;
  const { dataKey } = component.props;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={dataKey} context={context}>{component.props.label}</Label>
      <Input
        id={dataKey}
        {...register(dataKey, { valueAsNumber: true })}
        type="number"
        placeholder={component.props.placeholder}
        min={component.props.min}
        max={component.props.max}
        step={component.props.step}
      />
      <FieldError message={errors[dataKey]?.message as string | undefined} />
    </div>
  );
}
