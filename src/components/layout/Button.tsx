"use client";

import { twMerge } from "tailwind-merge";
import { ButtonComponent } from "@/lib/components/layout";

type Props = {
  component: ButtonComponent;
  isLoading: boolean;
};

export function Button({ component, isLoading }: Props) {
  return (
    <div className={twMerge(component.props.alignBottom ? "mt-auto pt-5" : "")}>
      <button
        type="submit"
        disabled={component.props.disabled || isLoading}
        className="w-full h-10 bg-black text-white uppercase text-sm font-medium tracking-wide rounded-sm hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {isLoading ? "…" : (component.props.text ?? "Continue")}
      </button>
    </div>
  );
}
