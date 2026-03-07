"use client";

import { getActiveState } from "@/lib/flow";
import { FrameworkScreen } from "@/lib/screen";
import Button from "@/src/components/Button";
import CheckboxGroup from "@/src/components/CheckboxGroup";
import Rating from "@/src/components/Rating";
import Stepper from "@/src/components/Stepper";
import { useExperimentStore } from "@/src/data/store";
import { useState } from "react";
import { Context } from "@/lib/types";
import { getValue } from "@/lib/conditions";

function resolveLabel(label: string, context: Context): string {
  return label.replace(/(\$\$[\w.-]+|@[\w.]+)/g, (match) => {
    const key = match as `$$${string}` | `@${string}`;
    const resolved = getValue(context, key);
    return resolved != null ? String(resolved) : match;
  });
}

export default function Home() {
  const { step, isLoading, start, next } = useExperimentStore();

  if (!step) {
    return (
      <>
        <h1 className="text-2xl font-semibold mb-6">Experiment</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <Button label="Start" />
        </form>
      </>
    );
  }

  const activeState = getActiveState(step.state);

  if (activeState.type === "end") {
    return (
      <>
        <h1 className="text-2xl font-semibold mb-2">All done!</h1>
        <p className="text-zinc-500 mb-8">
          Thanks for completing the experiment.
        </p>
        <pre className="text-xs bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 overflow-auto max-h-64 text-zinc-700 dark:text-zinc-300">
          {JSON.stringify(step.context, null, 2)}
        </pre>
      </>
    );
  }

  if (activeState.type === "in-node" && activeState.node.type === "screen") {
    const slug = activeState.node.props.slug;
    const screen = step.experiment.screens.find((s) => s.slug === slug);
    return (
      <>
        {step.state.type === "in-path" && step.state.node.props.stepper && (
          <Stepper
            config={step.state.node.props.stepper}
            step={step.state.step}
            total={step.state.childrens.length}
          />
        )}
        {screen ? (
          <Screen
            screen={screen}
            isLoading={isLoading}
            onNext={next}
            context={step.context}
          />
        ) : (
          <p className="text-red-500">Screen not found: {slug}</p>
        )}
        <pre className="font-mono text-xs mt-6">
          <code>{JSON.stringify(step.context, null, 2)}</code>
        </pre>
      </>
    );
  }

  // Fallback for any auto-traversal states still in flight
  return (
    <>
      <p className="text-zinc-400">Loading…</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Screen renderer — maps each slug to its UI
// ---------------------------------------------------------------------------

type ScreenProps = {
  screen: FrameworkScreen;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
  context: Context;
};

function Screen({ screen, isLoading, onNext, context }: ScreenProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span>screen slug: {screen.slug}</span>
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
              return null;
            }
          }
          return null;
        })}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      </form>
    </div>
  );
}
