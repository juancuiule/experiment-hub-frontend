"use client";

import { UseFormReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { TextAreaComponent } from "@/lib/components/response";
import { Context } from "@/lib/types";
import { FieldError, inputBase, resolveString } from "../primitives";

type Props = {
  component: TextAreaComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function TextArea({ component, form, context }: Props) {
  const { register, formState: { errors } } = form;
  const { dataKey } = component.props;

  return (
    <div className="my-4 flex flex-col gap-1">
      <label className="text-sm">{resolveString(component.props.label, context)}</label>
      <textarea
        {...register(dataKey)}
        rows={component.props.lines ?? 4}
        placeholder={component.props.placeholder}
        className={twMerge(inputBase, "resize-none")}
      />
      <FieldError message={errors[dataKey]?.message as string | undefined} />
    </div>
  );
}
