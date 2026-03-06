"use client";

import { useState } from "react";
import { getActiveState } from "../lib/flow";
import { useExperimentStore } from "../lib/store";

export default function Home() {
  const { step, isLoading, start, next } = useExperimentStore();

  if (!step) {
    return (
      <Layout>
        <h1 className="text-2xl font-semibold mb-6">Experiment</h1>
        <Button onClick={() => start()}>Start</Button>
      </Layout>
    );
  }

  const activeState = getActiveState(step.state);

  if (activeState.type === "end") {
    return (
      <Layout>
        <h1 className="text-2xl font-semibold mb-2">All done!</h1>
        <p className="text-zinc-500 mb-8">
          Thanks for completing the experiment.
        </p>
        <pre className="text-xs bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 overflow-auto max-h-64 text-zinc-700 dark:text-zinc-300">
          {JSON.stringify(step.context, null, 2)}
        </pre>
      </Layout>
    );
  }

  if (activeState.type === "in-node" && activeState.node.type === "screen") {
    return (
      <Layout>
        {step.state.type === "in-path" && step.state.node.props.stepper && (
          <div className="w-full mb-6">
            <p className="text-sm text-zinc-400 mb-2">
              {step.state.node.props.stepper.label
                ?.replace("{index}", String(step.state.step + 1))
                .replace("{total}", String(step.state.childrens.length))}
            </p>
            <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              {step.state.node.props.stepper.style === "dashed" ? (
                <div className="h-full flex gap-0.5">
                  {step.state.childrens.map((_, index) => (
                    <div
                      key={index}
                      className={`h-full flex-1 ${index < step.state.step + 1 ? "bg-black dark:bg-white" : "bg-zinc-300 dark:bg-zinc-600"}`}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="h-full bg-black dark:bg-white transition-all duration-300"
                  style={{
                    width: `${((step.state.step + 1) / step.state.childrens.length) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        )}
        <Screen
          slug={activeState.node.props.slug}
          isLoading={isLoading}
          onNext={next}
        />
        <pre className="font-mono text-xs mt-6">
          <code>{JSON.stringify(step.context, null, 2)}</code>
        </pre>
      </Layout>
    );
  }

  // Fallback for any auto-traversal states still in flight
  return (
    <Layout>
      <p className="text-zinc-400">Loading…</p>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Screen renderer — maps each slug to its UI
// ---------------------------------------------------------------------------

type ScreenProps = {
  slug: string;
  isLoading: boolean;
  onNext: (data?: Record<string, any>) => Promise<void>;
};

function Screen({ slug, isLoading, onNext }: ScreenProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span>screen slug: {slug}</span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          const json = formData.get("data");
          if (typeof json !== "string" || json.trim() === "") {
            onNext();
          } else {
            try {
              const data = JSON.parse(json);
              onNext(data);
            } catch {
              setError("Invalid JSON — please check your input.");
            }
          }
        }}
      >
        <textarea
          name="data"
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-2 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Loading…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-md px-8 py-16">{children}</main>
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
}) {
  const base =
    "h-11 px-6 rounded-full font-medium transition-colors disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      : "border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}
