"use client";

import { TextInputComponent } from "@/lib/components/response";
import { resolveValuesInString } from "@/lib/resolve";
import { Context } from "@/lib/types";
import { UseFormReturn } from "react-hook-form";
import { FieldError, inputBase } from "../primitives";

type Props = {
  component: TextInputComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function TextInput({ component, form, context }: Props) {
  const {
    register,
    formState: { errors },
  } = form;
  const { dataKey } = component.props;

  return (
    <div className="my-4 flex flex-col gap-1">
      <label htmlFor={dataKey}>
        {resolveValuesInString(component.props.label, context)}
      </label>
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
