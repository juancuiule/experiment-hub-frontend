"use client";

import { UseFormReturn } from "react-hook-form";
import { TextInputComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import { FieldError, inputBase, resolveString } from "../primitives";

type Props = {
  component: TextInputComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function TextInput({ component, form, context }: Props) {
  const { register, formState: { errors } } = form;
  const { dataKey } = component.props;

  return (
    <div className="my-4 flex flex-col gap-1">
      <label htmlFor={dataKey} className="text-sm">{resolveString(component.props.label, context)}</label>
      <input
        {...register(dataKey)}
        id={dataKey}
        type="text"
        placeholder={component.props.placeholder}
        className={inputBase}
      />
      <FieldError message={errors[dataKey]?.message as string | undefined} />
    </div>
  );
}
