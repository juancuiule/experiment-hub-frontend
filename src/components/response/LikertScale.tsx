"use client";

import { LikertScaleComponent } from "@/lib/components/response";
import { resolveValuesInString } from "@/lib/resolve";
import { Context } from "@/lib/types";
import { Controller, UseFormReturn } from "react-hook-form";
import { twMerge } from "tailwind-merge";
import { FieldError } from "../primitives";

type Props = {
  component: LikertScaleComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
};

export function LikertScale({ component, form, context }: Props) {
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
          <label>{resolveValuesInString(component.props.label, context)}</label>
          <div className="mt-3">
            <div className="flex items-center justify-between gap-1">
              {component.props.options.map((opt) => {
                const selected = field.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={twMerge(
                      "w-8 h-8 rounded-full border text-sm shrink-0 transition-colors",
                      selected
                        ? "bg-black text-white border-black font-medium"
                        : "bg-white text-black border-gray-300 hover:border-gray-500",
                    )}
                  >
                    {opt.value}
                  </button>
                );
              })}
            </div>
            <div className="flex items-start mt-1">
              {component.props.options.map((opt, i, list) => (
                <div
                  key={opt.value}
                  className={twMerge(
                    "flex-1 flex justify-center",
                    i === 0
                      ? "justify-start"
                      : i === list.length - 1
                        ? "justify-end"
                        : "justify-center",
                  )}
                >
                  {opt.label && (
                    <span
                      className={twMerge(
                        "text-xs text-center",
                        i === 0
                          ? "text-left"
                          : i === list.length - 1
                            ? "text-right"
                            : "",
                        field.value === opt.value
                          ? "font-medium text-black"
                          : "text-gray-400",
                      )}
                    >
                      {opt.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <FieldError
            message={errors[dataKey]?.message as string | undefined}
          />
        </div>
      )}
    />
  );
}
