"use client";
import { ScreenComponent } from "@/lib/components";
import { FrameworkScreen } from "@/lib/screen";
import { Context } from "@/lib/types";
import { resolveValuesInString } from "@/lib/resolve";
import { buildSchema, FieldErrors } from "@/lib/validation";
import { useState } from "react";
import Button from "./components/Button";
import CheckboxGroup from "./components/CheckboxGroup";
import Dropdown from "./components/Dropdown";
import Input from "./components/Input";
import Radio from "./components/Radio";
import Rating from "./components/Rating";
import RichText from "./components/RichText";
import SingleCheckbox from "./components/SingleCheckbox";
import Slider from "./components/Slider";

type ScreenProps = {
  screen: FrameworkScreen;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
  context: Context;
};

function extractData(
  component: ScreenComponent,
  formData: FormData,
): Record<string, any> {
  if (component.componentFamily !== "response") return {};
  const { dataKey } = component.props;
  if (component.template === "checkboxes") {
    return { [dataKey]: formData.getAll(dataKey) as string[] };
  }
  return { [dataKey]: formData.get(dataKey) };
}

function renderComponent(
  component: ScreenComponent,
  index: number,
  isLoading: boolean,
  errors: FieldErrors,
  context: Context,
) {
  switch (component.componentFamily) {
    case "layout": {
      switch (component.template) {
        case "button": {
          return (
            <Button
              key={index}
              text={isLoading ? "Loading..." : component.props.text}
              disabled={isLoading || component.props.disabled}
            />
          );
        }
        case "group": {
          return (
            <div>
              {component.props.components.map((child, i) =>
                renderComponent(child, i, isLoading, errors, context),
              )}
            </div>
          );
        }
      }
    }

    case "content": {
      switch (component.template) {
        case "rich-text": {
          return (
            <RichText
              key={index}
              content={resolveValuesInString(component.props.content, context)}
            />
          );
        }
        case "audio": {
          return <audio src={component.props.url} />;
        }
        case "image": {
          return (
            <img src={component.props.url} alt={component.props.alt || ""} />
          );
        }
        case "video": {
          return <video src={component.props.url} controls />;
        }
      }
    }

    case "response": {
      const { dataKey } = component.props;
      const error = errors[dataKey];
      switch (component.template) {
        case "text-input":
          return (
            <Input
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              placeholder={component.props.placeholder}
              error={error}
            />
          );
        case "rating":
          return (
            <Rating
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              max={component.props.max}
              error={error}
            />
          );
        case "checkboxes":
          return (
            <CheckboxGroup
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              options={component.props.options}
              error={error}
            />
          );
        case "slider":
          return (
            <Slider
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              min={component.props.min}
              max={component.props.max}
              step={component.props.step}
              defaultValue={component.props.defaultValue}
              minLabel={component.props.minLabel}
              maxLabel={component.props.maxLabel}
              error={error}
            />
          );
        case "dropdown":
          return (
            <Dropdown
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              options={component.props.options}
              error={error}
            />
          );
        case "radio":
          return (
            <Radio
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              options={component.props.options}
              error={error}
            />
          );
        case "single-checkbox":
          return (
            <SingleCheckbox
              key={dataKey}
              dataKey={dataKey}
              label={resolveValuesInString(component.props.label, context)}
              defaultValue={component.props.defaultValue}
              error={error}
            />
          );
      }
      break;
    }
  }
  return null;
}

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
            .map((c) => extractData(c, formData))
            .reduce<
              Record<string, any>
            >((acc, curr) => ({ ...acc, ...curr }), {});

          const result = buildSchema(screen.components).safeParse(data);
          if (!result.success) {
            setErrors(
              result.error.issues.reduce<FieldErrors>(
                (acc, issue) => ({
                  ...acc,
                  [String(issue.path[0])]: issue.message,
                }),
                {},
              ),
            );
            return;
          }

          setErrors({});
          // TODO: surface error to user (toast / inline message)
          onNext(result.data)
            // .then(() => {
            //   target?.reset();
            // })
            .catch((err) =>
              console.error("Failed to advance experiment:", err),
            );
        }}
      >
        {screen.components.map((component, i) =>
          renderComponent(component, i, isLoading, errors, context),
        )}
        {Object.keys(errors).length > 0 && (
          <p className="text-red-500 text-sm mt-2">
            Please fill in all required fields before continuing.
          </p>
        )}
      </form>
    </div>
  );
}
