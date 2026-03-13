"use client";

import { UseFormReturn } from "react-hook-form";
import { TimeInputComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import { FieldError, inputBase, resolveString } from "../primitives";

type Props = {
  component: TimeInputComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function TimeInput({ component, form, context }: Props) {
  const {
    register,
    formState: { errors },
  } = form;
  const { dataKey } = component.props;

  return (
    <div className="my-4 flex flex-col gap-1">
      <label>{resolveString(component.props.label, context)}</label>
      <input {...register(dataKey)} type="time" className={inputBase} />
      <FieldError message={errors[dataKey]?.message as string | undefined} />
    </div>
  );
}
