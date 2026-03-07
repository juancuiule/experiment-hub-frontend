"use client";
import { FrameworkScreen } from "@/lib/screen";
import { Context } from "@/lib/types";
import { resolveValuesInString } from "@/lib/resolve";
import { buildSchema, FieldErrors } from "@/lib/validation";
import { useState } from "react";
import Button from "./Button";
import CheckboxGroup from "./CheckboxGroup";
import Rating from "./Rating";
import Input from "./Input";
import RichText from "./RichText";

type ScreenProps = {
  screen: FrameworkScreen;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
  context: Context;
};

export function Screen({ screen, isLoading, onNext, context }: ScreenProps) {
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <div>
      <form
        key={screen.slug}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.currentTarget;
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
                case "rich-text": {
                  return {};
                }
              }
            })
            .reduce<Record<string, any>>((acc, curr) => ({ ...acc, ...curr }), {});

          const result = buildSchema(screen.components).safeParse(data);
          if (!result.success) {
            setErrors(
              result.error.issues.reduce<FieldErrors>(
                (acc, issue) => ({ ...acc, [String(issue.path[0])]: issue.message }),
                {}
              )
            );
            return;
          }

          setErrors({});
          // TODO: surface error to user (toast / inline message)
          onNext(result.data)
            .then(() => { target?.reset(); })
            .catch((err) => console.error("Failed to advance experiment:", err));
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
                      : resolveValuesInString(component.label, context)
                  }
                />
              );
            }
            case "checkbox-group": {
              return (
                <CheckboxGroup
                  key={component.dataKey}
                  {...component}
                  label={resolveValuesInString(component.label, context)}
                  error={errors[component.dataKey]}
                />
              );
            }
            case "rating": {
              return (
                <Rating
                  key={component.dataKey}
                  {...component}
                  label={resolveValuesInString(component.label, context)}
                  error={errors[component.dataKey]}
                />
              );
            }
            case "input": {
              return (
                <Input
                  key={component.dataKey}
                  {...component}
                  label={resolveValuesInString(component.label, context)}
                  error={errors[component.dataKey]}
                />
              );
            }
            case "rich-text": {
              return (
                <RichText
                  key={i}
                  content={resolveValuesInString(component.content, context)}
                />
              );
            }
          }
          return null;
        })}
        {Object.keys(errors).length > 0 && (
          <p className="text-red-500 text-sm mt-2">
            Please fill in all required fields before continuing.
          </p>
        )}
      </form>
    </div>
  );
}
