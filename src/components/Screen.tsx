"use client";
import { getValue } from "@/lib/conditions";
import { FrameworkScreen } from "@/lib/screen";
import { Context } from "@/lib/types";
import { useState } from "react";
import Button from "./Button";
import CheckboxGroup from "./CheckboxGroup";
import Rating from "./Rating";
import Input from "./Input";

type ScreenProps = {
  screen: FrameworkScreen;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
  context: Context;
};

function resolveLabel(label: string, context: Context): string {
  return label.replace(/(\$\$[\w.-]+|@[\w.]+)/g, (match) => {
    const key = match as `$$${string}` | `@${string}`;
    const resolved = getValue(context, key);
    return resolved != null ? String(resolved) : match;
  });
}

export function Screen({ screen, isLoading, onNext, context }: ScreenProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <form
        key={screen.slug}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.currentTarget;
          setError(null);
          const formData = new FormData(target);
          const data = screen.components
            .map((component) => {
              switch (component.type) {
                case "button": {
                  return {};
                }
                case "checkbox-group": {
                  const values = formData.getAll(component.dataKey) as string[];
                  return { [component.dataKey]: values };
                }
                case "rating": {
                  const value = formData.get(component.dataKey);
                  return { [component.dataKey]: value };
                }
                case "input": {
                  const value = formData.get(component.dataKey);
                  return { [component.dataKey]: value };
                }
              }
            })
            .reduce((acc, curr) => ({ ...acc, ...curr }), {});

          onNext(data).then(() => {
            if (target !== null) {
              target.reset();
            }
          });
        }}
      >
        {screen.components.map((component, i) => {
          switch (component.type) {
            case "button": {
              return (
                <Button
                  key={i}
                  label={
                    isLoading
                      ? "Loading..."
                      : resolveLabel(component.label, context)
                  }
                />
              );
            }
            case "checkbox-group": {
              return (
                <CheckboxGroup
                  key={component.dataKey}
                  {...component}
                  label={resolveLabel(component.label, context)}
                />
              );
            }
            case "rating": {
              return (
                <Rating
                  key={component.dataKey}
                  {...component}
                  label={resolveLabel(component.label, context)}
                />
              );
            }
            case "input": {
              return (
                <Input
                  key={component.dataKey}
                  {...component}
                  label={resolveLabel(component.label, context)}
                />
              );
            }
          }
          return null;
        })}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      </form>
    </div>
  );
}
