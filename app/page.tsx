"use client";

import { getActiveState } from "@/lib/flow";
import Button from "@/src/components/Button";
import Stepper from "@/src/components/Stepper";
import { useExperimentStore } from "@/src/data/store";
import { useState } from "react";

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
          <Stepper
            config={step.state.node.props.stepper}
            step={step.state.step}
            total={step.state.childrens.length}
          />
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
