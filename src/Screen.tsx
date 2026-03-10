"use client";
import { ScreenComponent } from "@/lib/components";
import { FrameworkScreen } from "@/lib/screen";
import { Context } from "@/lib/types";
import { buildSchema } from "@/lib/validation";
import { useState } from "react";
import Markdown from "react-markdown";
import { twMerge } from "tailwind-merge";

type FieldErrors = Record<string, string>;

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

function RenderComponent({ component }: { component: ScreenComponent }) {
  switch (component.componentFamily) {
    case "content": {
      switch (component.template) {
        case "rich-text": {
          return (
            <div>
              <Markdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 {...props} className="text-5xl font-bold" />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 {...props} className="text-4xl font-bold" />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 {...props} className="text-2xl font-bold" />
                  ),
                  a: ({ node, ...props }) => (
                    <a {...props} className="text-info underline" />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      {...props}
                      className="border-l-4 border-gray-300 pl-4 text-gray-500"
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul {...props} className="list-disc list-inside" />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol {...props} className="list-decimal list-inside" />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-black" {...props} />
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
                {component.props.content}
              </Markdown>
            </div>
          );
        }
      }
    }
    case "response": {
      switch (component.template) {
        case "text-input": {
          return (
            <div className="my-3 flex flex-col gap-2">
              <label className="text-md">{component.props.label}</label>
              <input
                type="text"
                name={component.props.dataKey}
                className="border border-gray-300 w-full p-1"
              />
            </div>
          );
        }
      }
    }
    case "layout": {
      switch (component.template) {
        case "button": {
          return (
            <div className="pt-5 mt-auto">
              <button
                className={twMerge(
                  "w-full h-10 bg-black text-white uppercase font-medium rounded-sm hover:bg-black/80 cursor-pointer",
                )}
              >
                {component.props.text}
              </button>
            </div>
          );
        }
      }
    }
  }

  return (
    <pre className="text-xs">
      <code>{JSON.stringify(component, null, 2)}</code>
    </pre>
  );
}

export function Screen({ screen, isLoading, onNext, context }: ScreenProps) {
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
      <form
        className="mt-5 h-full flex-1 flex flex-col"
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

          const result = buildSchema(screen).safeParse(data);
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
          onNext(data)
            // .then(() => {
            //   target?.reset();
            // })
            .catch((err) =>
              console.error("Failed to advance experiment:", err),
            );
        }}
      >
        {screen.components.map((component, i) => (
          <RenderComponent
            key={
              component.componentFamily === "response"
                ? component.props.dataKey
                : i
            }
            component={component}
          />
        ))}
        {Object.keys(errors).length > 0 && (
          <p className="text-red-500 text-sm mt-2">
            Please fill in all required fields before continuing.
          </p>
        )}
      </form>
  );
}
