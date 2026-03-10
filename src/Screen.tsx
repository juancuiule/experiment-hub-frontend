"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, UseFormReturn, useWatch } from "react-hook-form";
import Markdown from "react-markdown";
import { twMerge } from "tailwind-merge";

import { evaluateCondition } from "@/lib/conditions";
import { ScreenComponent } from "@/lib/components";
import { FrameworkScreen } from "@/lib/screen";
import { Context } from "@/lib/types";
import { buildSchema } from "@/lib/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScreenProps = {
  screen: FrameworkScreen;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
  context: Context;
};

type RenderProps = {
  component: ScreenComponent;
  form: UseFormReturn<Record<string, any>>;
  context: Context;
  isLoading: boolean;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function resolveString(template: string, context: Context): string {
  let result = template;

  if (context.currentItem) {
    result = result.replace(/@(\w+)/g, (match, key) => {
      const val = (context.currentItem as any)?.[key];
      return val !== undefined ? String(val) : match;
    });
  }

  result = result.replace(/\$\$([a-zA-Z0-9_.]+)/g, (match, path) => {
    const parts = path.split(".");
    let value: any = context.data;
    for (const part of parts) {
      if (value == null) return match;
      value = value[part];
    }
    return value !== undefined ? String(value) : match;
  });

  return result;
}

function buildDefaultValues(screen: FrameworkScreen): Record<string, any> {
  const values: Record<string, any> = {};
  for (const c of screen.components) {
    if (c.componentFamily !== "response") continue;
    switch (c.template) {
      case "checkboxes":
        values[c.props.dataKey] = [];
        break;
      case "single-checkbox":
        values[c.props.dataKey] = c.props.defaultValue ?? false;
        break;
      case "slider":
        values[c.props.dataKey] = c.props.defaultValue ?? c.props.min ?? 0;
        break;
      case "numeric-input":
        values[c.props.dataKey] = c.props.defaultValue ?? null;
        break;
      default:
        values[c.props.dataKey] = "";
    }
  }
  return values;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-error text-xs mt-1">{message}</p>;
}

function CheckIcon() {
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

function ChevronDownIcon() {
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

const inputBase =
  "border-b border-gray-300 pb-1 pt-1 outline-none bg-transparent w-full placeholder:text-gray-300 focus:border-black transition-colors text-sm";

const checkboxBase =
  "w-4 h-4 border border-gray-400 rounded-sm flex items-center justify-center flex-shrink-0 data-[state=checked]:bg-black data-[state=checked]:border-black transition-colors";

// ---------------------------------------------------------------------------
// Conditional component (needs its own component to safely call useWatch)
// ---------------------------------------------------------------------------

function ConditionalRender({
  component,
  form,
  context,
  isLoading,
}: RenderProps & {
  component: Extract<ScreenComponent, { template: "conditional" }>;
}) {
  const formValues = useWatch({ control: form.control });
  const {
    operator,
    dataKey,
    value,
    component: innerComponent,
  } = component.props;

  const enrichedContext: Context = {
    ...context,
    screenData: formValues as Record<string, any>,
  };

  const shouldRender = evaluateCondition(
    { operator, dataKey, value },
    enrichedContext,
  );

  if (!shouldRender) return null;
  return (
    <RenderComponent
      component={innerComponent}
      form={form}
      context={context}
      isLoading={isLoading}
    />
  );
}

// ---------------------------------------------------------------------------
// RenderComponent
// ---------------------------------------------------------------------------

function RenderComponent({ component, form, context, isLoading }: RenderProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  switch (component.componentFamily) {
    // -------------------------------------------------------------------------
    // CONTENT
    // -------------------------------------------------------------------------
    case "content": {
      switch (component.template) {
        case "rich-text":
          return (
            <div className="my-3">
              <Markdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 {...props} className="text-5xl font-bold mb-4" />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 {...props} className="text-3xl font-bold mb-3" />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 {...props} className="text-xl font-bold mb-2" />
                  ),
                  p: ({ node, ...props }) => (
                    <p {...props} className="text-black mb-2" />
                  ),
                  a: ({ node, ...props }) => (
                    <a {...props} className="text-info underline" />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong {...props} className="font-bold" />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc list-inside mb-2" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal list-inside mb-2" />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      {...props}
                      className="border-l-4 border-gray-300 pl-4 text-gray-500"
                    />
                  ),
                  code: ({ node, ...props }) => (
                    <code
                      {...props}
                      className="bg-gray-100 text-gray-800 rounded p-1 text-sm whitespace-break-spaces"
                    />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre
                      {...props}
                      className="bg-gray-100 text-gray-800 rounded text-sm [&>code]:block [&>code]:bg-transparent"
                    />
                  ),
                }}
              >
                {resolveString(component.props.content, context)}
              </Markdown>
            </div>
          );

        case "image":
          return (
            <div className="my-3">
              <img
                src={component.props.url}
                alt={component.props.alt}
                className="w-full"
              />
            </div>
          );

        case "video":
          return (
            <div className="my-3">
              <video
                src={component.props.url}
                autoPlay={component.props.autoplay}
                muted={component.props.muted}
                loop={component.props.loop}
                controls={component.props.controls}
                className="w-full"
              />
            </div>
          );

        case "audio":
          return (
            <div className="my-3">
              <audio
                src={component.props.url}
                autoPlay={component.props.autoplay}
                loop={component.props.loop}
                controls={component.props.controls ?? true}
                className="w-full"
              />
            </div>
          );
      }
      break;
    }

    // -------------------------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------------------------
    case "response": {
      const { dataKey } = component.props;
      const error = errors[dataKey]?.message as string | undefined;
      const label = resolveString(component.props.label, context);

      switch (component.template) {
        case "text-input":
          return (
            <div className="my-4 flex flex-col gap-1">
              <label className="text-sm">{label}</label>
              <input
                {...register(dataKey)}
                type="text"
                placeholder={component.props.placeholder}
                className={inputBase}
              />
              <FieldError message={error} />
            </div>
          );

        case "text-area":
          return (
            <div className="my-4 flex flex-col gap-1">
              <label className="text-sm">{label}</label>
              <textarea
                {...register(dataKey)}
                rows={component.props.lines ?? 4}
                placeholder={component.props.placeholder}
                className={twMerge(inputBase, "resize-none")}
              />
              <FieldError message={error} />
            </div>
          );

        case "date-input":
          return (
            <div className="my-4 flex flex-col gap-1">
              <label className="text-sm">{label}</label>
              <input {...register(dataKey)} type="date" className={inputBase} />
              <FieldError message={error} />
            </div>
          );

        case "time-input":
          return (
            <div className="my-4 flex flex-col gap-1">
              <label className="text-sm">{label}</label>
              <input {...register(dataKey)} type="time" className={inputBase} />
              <FieldError message={error} />
            </div>
          );

        case "numeric-input":
          return (
            <div className="my-4 flex flex-col gap-1">
              <label className="text-sm">{label}</label>
              <input
                {...register(dataKey, { valueAsNumber: true })}
                type="number"
                placeholder={component.props.placeholder}
                min={component.props.min}
                max={component.props.max}
                step={component.props.step}
                className={inputBase}
              />
              <FieldError message={error} />
            </div>
          );

        case "single-checkbox":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => (
                <div className="my-4 flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <CheckboxPrimitive.Root
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className={checkboxBase}
                    >
                      <CheckboxPrimitive.Indicator>
                        <CheckIcon />
                      </CheckboxPrimitive.Indicator>
                    </CheckboxPrimitive.Root>
                    <label className="text-sm leading-tight">{label}</label>
                  </div>
                  <FieldError message={error} />
                </div>
              )}
            />
          );

        case "checkboxes":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => (
                <div className="my-4 flex flex-col gap-1">
                  <label className="text-sm">{label}</label>
                  <div className="flex flex-col gap-2 mt-2">
                    {component.props.options.map((opt) => {
                      const checked =
                        Array.isArray(field.value) &&
                        field.value.includes(opt.value);
                      return (
                        <div
                          key={opt.value}
                          className="flex items-center gap-2"
                        >
                          <CheckboxPrimitive.Root
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              const current = Array.isArray(field.value)
                                ? field.value
                                : [];
                              field.onChange(
                                isChecked
                                  ? [...current, opt.value]
                                  : current.filter(
                                      (v: string) => v !== opt.value,
                                    ),
                              );
                            }}
                            className={checkboxBase}
                          >
                            <CheckboxPrimitive.Indicator>
                              <CheckIcon />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                          <label className="text-sm">{opt.label}</label>
                        </div>
                      );
                    })}
                  </div>
                  <FieldError message={error} />
                </div>
              )}
            />
          );

        case "radio":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => (
                <div className="my-4 flex flex-col gap-1">
                  <label className="text-sm">{label}</label>
                  <RadioGroupPrimitive.Root
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2 mt-2"
                  >
                    {component.props.options.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupPrimitive.Item
                          value={opt.value}
                          className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0 data-[state=checked]:border-black transition-colors"
                        >
                          <RadioGroupPrimitive.Indicator className="w-2 h-2 rounded-full bg-black" />
                        </RadioGroupPrimitive.Item>
                        <label className="text-sm">{opt.label}</label>
                      </div>
                    ))}
                  </RadioGroupPrimitive.Root>
                  <FieldError message={error} />
                </div>
              )}
            />
          );

        case "dropdown":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => (
                <div className="my-4 flex flex-col gap-1">
                  <label className="text-sm">{label}</label>
                  <SelectPrimitive.Root
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectPrimitive.Trigger className="flex items-center justify-between border-b border-gray-300 pb-1 pt-1 w-full outline-none focus:border-black transition-colors data-[placeholder]:text-gray-300 text-sm">
                      <SelectPrimitive.Value placeholder="Select one" />
                      <SelectPrimitive.Icon>
                        <ChevronDownIcon />
                      </SelectPrimitive.Icon>
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Portal>
                      <SelectPrimitive.Content className="bg-white border border-gray-200 shadow-md rounded-sm z-50 overflow-hidden">
                        <SelectPrimitive.Viewport className="p-1">
                          {component.props.options.map((opt) => (
                            <SelectPrimitive.Item
                              key={opt.value}
                              value={opt.value}
                              className="flex items-center px-3 py-2 text-sm cursor-pointer outline-none data-[highlighted]:bg-gray-100 rounded-sm"
                            >
                              <SelectPrimitive.ItemText>
                                {opt.label}
                              </SelectPrimitive.ItemText>
                            </SelectPrimitive.Item>
                          ))}
                        </SelectPrimitive.Viewport>
                      </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                  </SelectPrimitive.Root>
                  <FieldError message={error} />
                </div>
              )}
            />
          );

        case "slider":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => {
                const min = component.props.min ?? 0;
                const max = component.props.max ?? 100;
                const value = field.value ?? min;
                return (
                  <div className="my-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{label}</label>
                      {component.props.showValue && (
                        <span className="text-sm font-medium tabular-nums">
                          {value}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <SliderPrimitive.Root
                        value={[value]}
                        min={min}
                        max={max}
                        step={component.props.step ?? 1}
                        onValueChange={([val]) => field.onChange(val)}
                        className="relative flex items-center w-full h-5 select-none touch-none"
                      >
                        <SliderPrimitive.Track className="relative h-px bg-gray-300 flex-1 rounded-full">
                          <SliderPrimitive.Range className="absolute h-full bg-black rounded-full" />
                        </SliderPrimitive.Track>
                        <SliderPrimitive.Thumb className="block w-4 h-4 bg-black rounded-full outline-none focus-visible:ring-2 focus-visible:ring-black/20 cursor-grab active:cursor-grabbing" />
                      </SliderPrimitive.Root>
                    </div>
                    {(component.props.minLabel || component.props.maxLabel) && (
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {component.props.minLabel}
                        </span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {component.props.maxLabel}
                        </span>
                      </div>
                    )}
                    <FieldError message={error} />
                  </div>
                );
              }}
            />
          );

        case "likert-scale":
          return (
            <Controller
              control={control}
              name={dataKey}
              render={({ field }) => (
                <div className="my-4 flex flex-col gap-1">
                  <label className="text-sm">{label}</label>
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
                  <FieldError message={error} />
                </div>
              )}
            />
          );
      }
      break;
    }

    // -------------------------------------------------------------------------
    // LAYOUT
    // -------------------------------------------------------------------------
    case "layout": {
      switch (component.template) {
        case "button":
          return (
            <div
              className={twMerge(
                "pt-3",
                component.props.alignBottom && "mt-auto pt-5",
              )}
            >
              <button
                type="submit"
                disabled={component.props.disabled || isLoading}
                className="w-full h-10 bg-black text-white uppercase text-sm font-medium tracking-wide rounded-sm hover:bg-black/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {isLoading ? "…" : (component.props.text ?? "Continue")}
              </button>
            </div>
          );

        case "group":
          return (
            <div className="my-2">
              {component.props.components.map((child, i) => (
                <RenderComponent
                  key={
                    child.componentFamily === "response"
                      ? child.props.dataKey
                      : i
                  }
                  component={child}
                  form={form}
                  context={context}
                  isLoading={isLoading}
                />
              ))}
            </div>
          );
      }
      break;
    }

    // -------------------------------------------------------------------------
    // CONTROL
    // -------------------------------------------------------------------------
    case "control": {
      switch (component.template) {
        case "conditional":
          return (
            <ConditionalRender
              component={component}
              form={form}
              context={context}
              isLoading={isLoading}
            />
          );

        case "for-each": {
          const { component: template } = component.props;
          const items: string[] =
            component.props.type === "static" ? component.props.values : [];

          return (
            <>
              {items.map((itemValue, index) => {
                const itemContext: Context = {
                  ...context,
                  currentItem: { value: itemValue, index, loopId: "for-each" },
                };
                const indexedComponent =
                  template.componentFamily === "response"
                    ? {
                        ...template,
                        props: {
                          ...template.props,
                          dataKey: `${template.props.dataKey}.${index}`,
                        },
                      }
                    : template;
                return (
                  <RenderComponent
                    key={index}
                    component={indexedComponent as ScreenComponent}
                    form={form}
                    context={itemContext}
                    isLoading={isLoading}
                  />
                );
              })}
            </>
          );
        }
      }
      break;
    }
  }

  // Fallback for unhandled templates
  return (
    <pre className="text-xs my-2 bg-gray-50 p-2 rounded">
      <code>{JSON.stringify(component, null, 2)}</code>
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function Screen({ screen, isLoading, onNext, context }: ScreenProps) {
  const form = useForm<Record<string, any>>({
    resolver: zodResolver(buildSchema(screen)),
    defaultValues: buildDefaultValues(screen),
  });

  const onSubmit = (data: Record<string, any>) => {
    onNext(data).catch((err) =>
      console.error("Failed to advance experiment:", err),
    );
  };

  return (
    <form
      className="mt-5 h-full flex-1 flex flex-col"
      key={screen.slug}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {screen.components.map((component, i) => (
        <RenderComponent
          key={
            component.componentFamily === "response"
              ? component.props.dataKey
              : i
          }
          component={component}
          form={form}
          context={context}
          isLoading={isLoading}
        />
      ))}
    </form>
  );
}
