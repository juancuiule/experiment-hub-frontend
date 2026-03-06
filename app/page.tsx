"use client";

import { FormEvent, useState } from "react";
import { getActiveState, useExperimentStore } from "../lib/store";

export default function Home() {
  const { step, isLoading, start, next } = useExperimentStore();

  console.log("Current step:", step);

  if (!step) {
    return (
      <Layout>
        <h1 className="text-2xl font-semibold mb-6">Experiment</h1>
        <p className="text-zinc-500 mb-8">Choose how you arrived:</p>
        <div className="flex gap-3">
          <Button onClick={() => start("start-google")}>From Google</Button>
          <Button onClick={() => start("start-facebook")} variant="secondary">
            From Facebook
          </Button>
        </div>
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
        {step.state.type === "in-path" && (
          <p className="text-sm text-zinc-400 mb-4">
            In path: {step.state.step} of {step.state.childs.length}
          </p>
        )}
        <Screen
          slug={activeState.node.props.slug}
          isLoading={isLoading}
          onNext={next}
        />
        <pre className="font-mono text-xs">
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
  return (
    <div>
      <span>screen slug: {slug}</span>
      <form
        onSubmit={(e) => {
          // get form data
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const json = formData.get("data");
          if (typeof json !== "string" || json.trim() === "") {
            console.error("No data provided");
            onNext();
          } else {
            const data = JSON.parse(formData.get("data") as string);
            onNext(data);
          }
        }}
      >
        <textarea
          name="data"
          className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 mb-6 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
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
