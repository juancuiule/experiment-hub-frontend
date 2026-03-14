"use client";

import { ScreenComponent } from "@/lib/components";
import { Option, OptionsSource } from "@/lib/components/response";
import { getValue } from "@/lib/resolve";
import { Context } from "@/lib/types";
import { UseFormReturn } from "react-hook-form";

export type RenderProps = {
  component: ScreenComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
  isLoading: boolean;
};

export const inputBase =
  "border-b border-gray-300 pb-1 pt-1 outline-none bg-transparent w-full placeholder:text-gray-300 focus:border-black transition-colors text-sm";

export const checkboxBase =
  "size-4 border border-gray-400 rounded-sm flex items-center justify-center flex-shrink-0 data-[state=checked]:bg-black data-[state=checked]:border-black transition-colors";

export function resolveOptions(
  options: OptionsSource,
  context: Context,
): Option[] {
  if (Array.isArray(options)) return options;
  const value = getValue(options, context);
  if (!Array.isArray(value)) return [];
  return value.map((item: unknown) =>
    typeof item === "string" ? { label: item, value: item } : (item as Option),
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-error text-xs mt-1">{message}</p>;
}

export function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
