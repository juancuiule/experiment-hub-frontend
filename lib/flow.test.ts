import { afterEach, describe, expect, it, vi } from "vitest";
import { startExperiment, traverse, next } from "./flow";
import { evaluateCondition, getValue } from "./conditions";
import { ExperimentFlow } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScreen(id: string, slug?: string): ExperimentFlow["nodes"][0] {
  return { id, type: "screen", props: { slug: slug ?? id } };
}

function seq(from: string, to: string): ExperimentFlow["edges"][0] {
  return { type: "sequential", from, to };
}

// ---------------------------------------------------------------------------
// startExperiment
// ---------------------------------------------------------------------------

describe("startExperiment", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      {
        id: "start-a",
        type: "start",
        props: { name: "A", param: { key: "source", value: "a" } },
      },
      {
        id: "start-b",
        type: "start",
        props: { name: "B", param: { key: "source", value: "b" } },
      },
      makeScreen("screen-1"),
      makeScreen("screen-2"),
    ],
    edges: [seq("start-a", "screen-1"), seq("start-b", "screen-2")],
  };

  it("auto-advances past the start node and lands on the first screen", async () => {
    const step = await startExperiment(flow, "start-a");
    expect(step.state.type).toBe("in-node");
    expect((step.state as any).node.id).toBe("screen-1");
  });

  it("records the start group in context", async () => {
    const step = await startExperiment(flow, "start-a");
    expect(step.context.start?.group).toBe("source=a");
  });

  it("picks the correct start node when two exist", async () => {
    const step = await startExperiment(flow, "start-b");
    expect((step.state as any).node.id).toBe("screen-2");
    expect(step.context.start?.group).toBe("source=b");
  });

  it("falls back to the first start node when no id is given", async () => {
    const step = await startExperiment(flow);
    expect((step.state as any).node.id).toBe("screen-1");
  });

  it("throws when the given startNodeId does not exist", async () => {
    await expect(startExperiment(flow, "nope")).rejects.toThrow(
      "Start node not found: nope",
    );
  });
});

// ---------------------------------------------------------------------------
// Screen traversal
// ---------------------------------------------------------------------------

describe("screen traversal", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      makeScreen("screen-a", "slug-a"),
      makeScreen("screen-b", "slug-b"),
    ],
    edges: [seq("start", "screen-a"), seq("screen-a", "screen-b")],
  };

  it("stores data into context.data keyed by screen slug and advances", async () => {
    const step = await startExperiment(flow, "start"); // on screen-a
    const next = await traverse(step, { age: 25 }); // store + advance to screen-b
    expect(next.context.data?.["slug-a"]).toEqual({ age: 25 });
    expect((next.state as any).node.id).toBe("screen-b");
  });

  it("accumulates data across multiple screens", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, { age: 25 }); // screen-a → screen-b
    const step3 = await traverse(step2, { name: "juan" }); // store on screen-b (end of flow)
    expect(step3.context.data?.["slug-a"]).toEqual({ age: 25 });
    expect(step3.context.data?.["slug-b"]).toEqual({ name: "juan" });
  });

  it("stays on the last screen when there is no sequential edge out of it", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, { age: 25 }); // → screen-b
    const step3 = await traverse(step2, { name: "juan" }); // store on screen-b, no next node
    const step4 = await traverse(step3, {}); // no data → no-op
    expect(step4).toBe(step3);
  });
});

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

describe("checkpoint", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      makeScreen("screen-before", "before"),
      { id: "cp", type: "checkpoint", props: { name: "mid-point" } },
      makeScreen("screen-after", "after"),
    ],
    edges: [
      seq("start", "screen-before"),
      seq("screen-before", "cp"),
      seq("cp", "screen-after"),
    ],
  };

  it("auto-advances through the checkpoint and records a timestamp", async () => {
    const before = Date.now();
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, {}); // store {} + advance → cp → screen-after
    const after = Date.now();

    expect((step2.state as any).node.id).toBe("screen-after");
    const ts = step2.context.checkpoints?.["mid-point"];
    expect(ts).toBeDefined();
    expect(new Date(ts!).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(ts!).getTime()).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

describe("branch", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      makeScreen("screen-age", "age-screen"),
      {
        id: "branch-age",
        type: "branch",
        props: {
          name: "Age branch",
          branches: [
            {
              id: "minor",
              name: "Minor",
              config: {
                operator: "lt",
                value: 18,
                dataKey: "$$age-screen.age",
              },
            },
            {
              id: "adult",
              name: "Adult",
              config: {
                operator: "gte",
                value: 18,
                dataKey: "$$age-screen.age",
              },
            },
          ],
        },
      },
      makeScreen("screen-minor", "minor-screen"),
      makeScreen("screen-adult", "adult-screen"),
      makeScreen("screen-default", "default-screen"),
    ],
    edges: [
      seq("start", "screen-age"),
      seq("screen-age", "branch-age"),
      {
        type: "branch-condition",
        from: "branch-age.minor",
        to: "screen-minor",
      },
      {
        type: "branch-condition",
        from: "branch-age.adult",
        to: "screen-adult",
      },
      { type: "branch-default", from: "branch-age", to: "screen-default" },
    ],
  };

  it("follows the matching branch-condition edge", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, { age: 15 }); // store + advance → branch → screen-minor
    expect((step2.state as any).node.id).toBe("screen-minor");
    expect(step2.context.branches?.["branch-age"]).toBe("minor");
  });

  it("follows a different branch based on data", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, { age: 30 });
    expect((step2.state as any).node.id).toBe("screen-adult");
    expect(step2.context.branches?.["branch-age"]).toBe("adult");
  });

  it("falls back to branch-default when no condition matches", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, { age: "not-a-number" });
    expect((step2.state as any).node.id).toBe("screen-default");
    expect(step2.context.branches?.["branch-age"]).toBe("default");
  });

  it("falls back to branch-default when data is missing entirely", async () => {
    const step1 = await startExperiment(flow, "start");
    const step2 = await traverse(step1, {});
    expect((step2.state as any).node.id).toBe("screen-default");
  });
});

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

describe("path", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      { id: "path-q", type: "path", props: { name: "Questions" } },
      makeScreen("screen-q1", "q1"),
      makeScreen("screen-q2", "q2"),
      makeScreen("screen-q3", "q3"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "path-q"),
      { type: "path-contains", from: "path-q", to: "screen-q1", order: 0 },
      { type: "path-contains", from: "path-q", to: "screen-q2", order: 1 },
      { type: "path-contains", from: "path-q", to: "screen-q3", order: 2 },
      seq("path-q", "screen-end"),
    ],
  };

  it("starts on the first child of the path", async () => {
    const step = await startExperiment(flow, "start");
    expect(step.state.type).toBe("in-path");
    expect((step.state as any).innerState.node.id).toBe("screen-q1");
  });

  it("advances through path children in order", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 });
    expect((step.state as any).innerState.node.id).toBe("screen-q2");
    step = await traverse(step, { a: 2 });
    expect((step.state as any).innerState.node.id).toBe("screen-q3");
  });

  it("exits the path after the last child and advances to the next sequential node", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 });
    step = await traverse(step, { a: 2 });
    step = await traverse(step, { a: 3 }); // q3 done → exit path
    expect((step.state as any).node.id).toBe("screen-end");
  });

  it("tracks visited screen slugs in context.paths[nodeId].order", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 });
    step = await traverse(step, { a: 2 });
    step = await traverse(step, { a: 3 });
    expect(step.context.paths?.["path-q"]?.order).toEqual(["q1", "q2", "q3"]);
  });

  it("preserves screen data collected inside the path", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { answer: "yes" });
    step = await traverse(step, { answer: "no" });
    step = await traverse(step, { answer: "maybe" });
    expect(step.context.data?.["q1"]).toEqual({ answer: "yes" });
    expect(step.context.data?.["q2"]).toEqual({ answer: "no" });
    expect(step.context.data?.["q3"]).toEqual({ answer: "maybe" });
  });
});

// ---------------------------------------------------------------------------
// Loop (static)
// ---------------------------------------------------------------------------

describe("loop (static values)", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      {
        id: "loop-sports",
        type: "loop",
        props: { type: "static", values: ["football", "basketball", "tennis"] },
      },
      makeScreen("screen-sport", "sport-screen"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "loop-sports"),
      { type: "loop-template", from: "loop-sports", to: "screen-sport" },
      seq("loop-sports", "screen-end"),
    ],
  };

  it("starts on the template screen with __currentItem set for the first value", async () => {
    const step = await startExperiment(flow, "start");
    expect(step.state.type).toBe("in-loop");
    expect((step.state as any).index).toBe(0);
    expect(step.context.data?.["__currentItem"]).toEqual({
      value: "football",
      index: 0,
      loopId: "loop-sports",
    });
  });

  it("advances __currentItem on each iteration", async () => {
    let step = await startExperiment(flow, "start"); // index 0: football
    step = await traverse(step, { liked: true }); // advance to index 1: basketball
    expect((step.state as any).index).toBe(1);
    expect(step.context.data?.["__currentItem"]).toEqual({
      value: "basketball",
      index: 1,
      loopId: "loop-sports",
    });
  });

  it("exits the loop after the last iteration and strips __currentItem", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // football → basketball
    step = await traverse(step, {}); // basketball → tennis
    step = await traverse(step, {}); // tennis → exit loop
    expect((step.state as any).node.id).toBe("screen-end");
    expect(step.context.data?.["__currentItem"]).toBeUndefined();
  });

  it("iterates through all values in order", async () => {
    let step = await startExperiment(flow, "start");
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      seen.push(step.context.data?.["__currentItem"]?.value ?? "");
      step = await traverse(step, { liked: i % 2 === 0 });
    }
    expect(seen).toEqual(["football", "basketball", "tennis"]);
  });
});

// ---------------------------------------------------------------------------
// Fork
// ---------------------------------------------------------------------------

describe("fork", async () => {
  afterEach(() => vi.restoreAllMocks());

  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      {
        id: "fork-group",
        type: "fork",
        props: {
          forks: [
            { id: "groupA", name: "Group A", weight: 1 },
            { id: "groupB", name: "Group B", weight: 1 },
          ],
        },
      },
      makeScreen("screen-a", "slug-a"),
      makeScreen("screen-b", "slug-b"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "fork-group"),
      { type: "fork-edge", from: "fork-group.groupA", to: "screen-a" },
      { type: "fork-edge", from: "fork-group.groupB", to: "screen-b" },
      seq("screen-a", "screen-end"),
      seq("screen-b", "screen-end"),
    ],
  };

  it("auto-advances past the fork and lands on a fork branch screen", async () => {
    const step = await startExperiment(flow, "start");
    expect(step.state.type).toBe("in-node");
    expect(["screen-a", "screen-b"]).toContain((step.state as any).node.id);
  });

  it("records the fork choice in context.forks", async () => {
    const step = await startExperiment(flow, "start");
    expect(["groupA", "groupB"]).toContain(step.context.forks?.["fork-group"]);
  });

  it("selects groupA when Math.random() is biased low (rand < weight of first fork)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const step = await startExperiment(flow, "start");
    expect((step.state as any).node.id).toBe("screen-a");
    expect(step.context.forks?.["fork-group"]).toBe("groupA");
  });

  it("selects groupB when Math.random() is biased high (rand > weight of first fork)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const step = await startExperiment(flow, "start");
    expect((step.state as any).node.id).toBe("screen-b");
    expect(step.context.forks?.["fork-group"]).toBe("groupB");
  });

  it("respects unequal weights — heavily weighted fork wins most of the time", async () => {
    const heavyFlow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        {
          id: "fork-heavy",
          type: "fork",
          props: {
            forks: [
              { id: "rare", name: "Rare", weight: 1 },
              { id: "common", name: "Common", weight: 9 },
            ],
          },
        },
        makeScreen("screen-rare", "rare"),
        makeScreen("screen-common", "common"),
      ],
      edges: [
        seq("start", "fork-heavy"),
        { type: "fork-edge", from: "fork-heavy.rare", to: "screen-rare" },
        { type: "fork-edge", from: "fork-heavy.common", to: "screen-common" },
      ],
    };

    // total=10; rand=0.05*10=0.5 → rare wins (0.5 - 1 ≤ 0)
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    expect(
      ((await startExperiment(heavyFlow, "start")).state as any).node.id,
    ).toBe("screen-rare");

    // rand=0.5*10=5 → rare consumed (5-1=4>0), common wins (4-9≤0)
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(
      ((await startExperiment(heavyFlow, "start")).state as any).node.id,
    ).toBe("screen-common");
  });

  it("advances past the fork-selected screen to the next sequential node", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always groupA
    let step = await startExperiment(flow, "start"); // on screen-a
    step = await traverse(step, { answer: 42 }); // → screen-end
    expect((step.state as any).node.id).toBe("screen-end");
  });

  it("throws when no fork-edge exists for the selected fork id", async () => {
    const broken: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        {
          id: "fork-bad",
          type: "fork",
          props: { forks: [{ id: "x", name: "X", weight: 1 }] },
        },
      ],
      edges: [seq("start", "fork-bad")],
      // no fork-edge for fork-bad.x
    };
    await expect(startExperiment(broken, "start")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Loop — dynamic values from context
// ---------------------------------------------------------------------------

describe("loop (dynamic values from context)", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      makeScreen("screen-setup", "setup"),
      {
        id: "loop-dynamic",
        type: "loop",
        props: { type: "dynamic", dataKey: "$$setup.sports" },
      },
      makeScreen("screen-sport", "sport-screen"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "screen-setup"),
      seq("screen-setup", "loop-dynamic"),
      { type: "loop-template", from: "loop-dynamic", to: "screen-sport" },
      seq("loop-dynamic", "screen-end"),
    ],
  };

  it("reads loop values from context.data via the dataKey", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { sports: ["football", "tennis"] });
    expect(step.state.type).toBe("in-loop");
    expect(step.context.data?.["__currentItem"]?.value).toBe("football");
  });

  it("iterates through all dynamic values in order", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { sports: ["alpha", "beta", "gamma"] });
    const seen: string[] = [];
    while (step.state.type === "in-loop") {
      seen.push(step.context.data?.["__currentItem"]?.value);
      step = await traverse(step, { rated: true });
    }
    expect(seen).toEqual(["alpha", "beta", "gamma"]);
  });

  it("strips __currentItem from context after the loop exits", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { sports: ["only-one"] });
    step = await traverse(step, { rated: true }); // exit loop
    expect((step.state as any).node.id).toBe("screen-end");
    expect(step.context.data?.["__currentItem"]).toBeUndefined();
  });

  it("treats a missing context key as an empty array (loop body shows once with undefined value)", async () => {
    // dataKey points to a field that was never set
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // setup with no sports field → getValue returns undefined → []
    // With 0 values the loop still enters (index=0) and shows template once with undefined
    expect(step.state.type).toBe("in-loop");
    expect(step.context.data?.["__currentItem"]?.value).toBeUndefined();
    step = await traverse(step, {}); // submit → exit
    expect((step.state as any).node.id).toBe("screen-end");
  });
});

// ---------------------------------------------------------------------------
// Path containing non-screen node children
// ---------------------------------------------------------------------------

describe("path with a branch node as a child", async () => {
  // The branch auto-traverses when reached inside the path, routing to a
  // screen that is NOT in the path-contains list. The path advances its step
  // counter once the routed-to screen signals "done" (no sequential edge out).
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      { id: "path-quiz", type: "path", props: { name: "Adaptive quiz" } },
      makeScreen("screen-intro", "intro"),
      {
        id: "branch-skill",
        type: "branch",
        props: {
          name: "Skill level router",
          branches: [
            {
              id: "beginner",
              name: "Beginner",
              config: {
                operator: "eq",
                value: "beginner",
                dataKey: "$$intro.level",
              },
            },
            {
              id: "expert",
              name: "Expert",
              config: {
                operator: "eq",
                value: "expert",
                dataKey: "$$intro.level",
              },
            },
          ],
        },
      },
      makeScreen("screen-beginner", "beginner-q"),
      makeScreen("screen-expert", "expert-q"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "path-quiz"),
      {
        type: "path-contains",
        from: "path-quiz",
        to: "screen-intro",
        order: 0,
      },
      {
        type: "path-contains",
        from: "path-quiz",
        to: "branch-skill",
        order: 1,
      },
      // Branch routes to screens that are NOT path children — no path-contains edge
      {
        type: "branch-condition",
        from: "branch-skill.beginner",
        to: "screen-beginner",
      },
      {
        type: "branch-condition",
        from: "branch-skill.expert",
        to: "screen-expert",
      },
      { type: "branch-default", from: "branch-skill", to: "screen-expert" },
      seq("path-quiz", "screen-end"),
    ],
  };

  it("after submitting the intro screen the path advances to the branch (innerState = branch)", async () => {
    let step = await startExperiment(flow, "start"); // in-path, step=0, innerState=screen-intro
    step = await traverse(step, { level: "beginner" });
    // path.step=1, innerState=branch-skill (not yet auto-traversed by path logic)
    expect(step.state.type).toBe("in-path");
    expect((step.state as any).innerState.node.type).toBe("branch");
  });

  it("one more traverse call resolves the branch using previously collected context data", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { level: "beginner" }); // submit intro → advance to branch
    step = await traverse(step, {}); // trigger branch auto-traverse
    // branch evaluates $$intro.level == "beginner" → screen-beginner
    expect((step.state as any).innerState.node.id).toBe("screen-beginner");
    expect(step.context.branches?.["branch-skill"]).toBe("beginner");
  });

  it("routes to the expert screen when context says 'expert'", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { level: "expert" });
    step = await traverse(step, {});
    expect((step.state as any).innerState.node.id).toBe("screen-expert");
    expect(step.context.branches?.["branch-skill"]).toBe("expert");
  });

  it("path exits to the next sequential node after the branch-target screen is submitted", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { level: "expert" }); // submit intro → branch pending
    step = await traverse(step, {}); // branch resolves → screen-expert
    step = await traverse(step, { done: true }); // submit screen-expert → path done → screen-end
    expect((step.state as any).node.id).toBe("screen-end");
  });

  it("path order records the declared path children (screen slug + branch id)", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { level: "beginner" });
    step = await traverse(step, {});
    step = await traverse(step, { done: true });
    // order tracks the actual path children: screen by slug, branch by id
    expect(step.context.paths?.["path-quiz"]?.order).toEqual([
      "intro",
      "branch-skill",
    ]);
  });
});

describe("path with a checkpoint node as a child", async () => {
  // Checkpoint auto-traverses (records timestamp + advances via its sequential
  // edge). The sequential edge points to a screen that is NOT a path child.
  // The path step advances once that screen signals "done".
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      { id: "path-cp", type: "path", props: { name: "Path with checkpoint" } },
      makeScreen("screen-q1", "q1"),
      { id: "cp-inner", type: "checkpoint", props: { name: "mid-checkpoint" } },
      makeScreen("screen-after", "after-cp"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "path-cp"),
      { type: "path-contains", from: "path-cp", to: "screen-q1", order: 0 },
      { type: "path-contains", from: "path-cp", to: "cp-inner", order: 1 },
      // Checkpoint's sequential edge leads to a screen that is NOT a path child
      seq("cp-inner", "screen-after"),
      seq("path-cp", "screen-end"),
    ],
  };

  it("the checkpoint auto-traverses and its timestamp is recorded in context", async () => {
    const before = Date.now();
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 }); // submit q1 → path advances to cp-inner (pending)
    step = await traverse(step, {}); // trigger cp auto-traverse → screen-after
    const after = Date.now();
    const ts = step.context.checkpoints?.["mid-checkpoint"];
    expect(ts).toBeDefined();
    expect(new Date(ts!).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(ts!).getTime()).toBeLessThanOrEqual(after);
  });

  it("lands on the checkpoint's sequential-edge target after auto-traversal", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 }); // q1 → cp pending
    step = await traverse(step, {}); // cp → screen-after (inside path wrapper)
    expect((step.state as any).innerState.node.id).toBe("screen-after");
  });

  it("path exits to screen-end after the post-checkpoint screen is submitted", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { a: 1 }); // q1 → cp pending
    step = await traverse(step, {}); // cp → screen-after
    step = await traverse(step, { b: 2 }); // submit screen-after → path done → screen-end
    expect((step.state as any).node.id).toBe("screen-end");
  });
});

// ---------------------------------------------------------------------------
// Complex experiment — all node types combined
// ---------------------------------------------------------------------------

// Design:
//   start-google / start-facebook
//   → checkpoint("experiment-init")
//   → screen("welcome")
//   → screen("profile")
//   → branch(age < 18 → screen("minor") | else → screen("adult"))
//   → checkpoint("pre-experiment")
//   → fork([control:1, treatment:1])
//       control   → path("control-path",   [screen("ctrl-q1"), screen("ctrl-q2")])
//       treatment → path("treatment-path", [screen("tmt-q1"),  screen("tmt-q2")])
//   → loop(static: ["red","blue","green"], template: screen("item-eval"))
//   → checkpoint("experiment-done")
//   → screen("debrief")

const complexFlow: ExperimentFlow = {
  nodes: [
    {
      id: "start-google",
      type: "start",
      props: { name: "Google", param: { key: "source", value: "google" } },
    },
    {
      id: "start-facebook",
      type: "start",
      props: { name: "Facebook", param: { key: "source", value: "facebook" } },
    },
    { id: "cp-init", type: "checkpoint", props: { name: "experiment-init" } },
    makeScreen("screen-welcome", "welcome"),
    makeScreen("screen-profile", "profile"),
    {
      id: "branch-age",
      type: "branch",
      props: {
        name: "Age gate",
        branches: [
          {
            id: "minor",
            name: "Minor",
            config: { operator: "lt", value: 18, dataKey: "$$profile.age" },
          },
          {
            id: "adult",
            name: "Adult",
            config: { operator: "gte", value: 18, dataKey: "$$profile.age" },
          },
        ],
      },
    },
    makeScreen("screen-minor", "minor"),
    makeScreen("screen-adult", "adult"),
    { id: "cp-pre", type: "checkpoint", props: { name: "pre-experiment" } },
    {
      id: "fork-group",
      type: "fork",
      props: {
        forks: [
          { id: "control", name: "Control", weight: 1 },
          { id: "treatment", name: "Treatment", weight: 1 },
        ],
      },
    },
    { id: "path-control", type: "path", props: { name: "Control path" } },
    makeScreen("screen-ctrl-q1", "ctrl-q1"),
    makeScreen("screen-ctrl-q2", "ctrl-q2"),
    { id: "path-treatment", type: "path", props: { name: "Treatment path" } },
    makeScreen("screen-tmt-q1", "tmt-q1"),
    makeScreen("screen-tmt-q2", "tmt-q2"),
    {
      id: "loop-colors",
      type: "loop",
      props: { type: "static", values: ["red", "blue", "green"] },
    },
    makeScreen("screen-item-eval", "item-eval"),
    { id: "cp-done", type: "checkpoint", props: { name: "experiment-done" } },
    makeScreen("screen-debrief", "debrief"),
  ],
  edges: [
    // Both entry points converge at the first checkpoint
    seq("start-google", "cp-init"),
    seq("start-facebook", "cp-init"),
    seq("cp-init", "screen-welcome"),
    seq("screen-welcome", "screen-profile"),
    seq("screen-profile", "branch-age"),
    { type: "branch-condition", from: "branch-age.minor", to: "screen-minor" },
    { type: "branch-condition", from: "branch-age.adult", to: "screen-adult" },
    { type: "branch-default", from: "branch-age", to: "screen-adult" },
    seq("screen-minor", "cp-pre"),
    seq("screen-adult", "cp-pre"),
    seq("cp-pre", "fork-group"),
    { type: "fork-edge", from: "fork-group.control", to: "path-control" },
    { type: "fork-edge", from: "fork-group.treatment", to: "path-treatment" },
    {
      type: "path-contains",
      from: "path-control",
      to: "screen-ctrl-q1",
      order: 0,
    },
    {
      type: "path-contains",
      from: "path-control",
      to: "screen-ctrl-q2",
      order: 1,
    },
    {
      type: "path-contains",
      from: "path-treatment",
      to: "screen-tmt-q1",
      order: 0,
    },
    {
      type: "path-contains",
      from: "path-treatment",
      to: "screen-tmt-q2",
      order: 1,
    },
    // Both paths converge at the loop
    seq("path-control", "loop-colors"),
    seq("path-treatment", "loop-colors"),
    { type: "loop-template", from: "loop-colors", to: "screen-item-eval" },
    seq("loop-colors", "cp-done"),
    seq("cp-done", "screen-debrief"),
  ],
};

/** Drive the complex flow end-to-end for a given start node and age, with fork pinned. */
async function runComplexFlow(
  startNodeId: string,
  age: number,
  forkChoice: "control" | "treatment",
) {
  // Pin Math.random so fork selection is deterministic:
  //   total weight = 2, control is first (weight 1)
  //   rand = 0   → control wins   (0*2=0, 0-1=-1 ≤ 0)
  //   rand = 0.6 → treatment wins (0.6*2=1.2, 1.2-1=0.2 > 0; 0.2-1 ≤ 0)
  vi.spyOn(Math, "random").mockReturnValue(forkChoice === "control" ? 0 : 0.6);

  let step = await startExperiment(complexFlow, startNodeId);
  // After start → cp-init → welcome (all auto)
  expect((step.state as any).node.id).toBe("screen-welcome");

  step = await traverse(step, { viewed: true }); // welcome → profile
  step = await traverse(step, { age }); // profile → branch → age screen

  const ageBranch = age < 18 ? "minor" : "adult";
  expect(step.context.branches?.["branch-age"]).toBe(ageBranch);

  step = await traverse(step, { consented: true }); // age screen → cp-pre → fork → path

  // Now inside the chosen path
  expect(step.state.type).toBe("in-path");
  const expectedPathId =
    forkChoice === "control" ? "path-control" : "path-treatment";
  expect((step.state as any).node.id).toBe(expectedPathId);

  step = await traverse(step, { q1: "answer-1" }); // q1 → q2
  step = await traverse(step, { q2: "answer-2" }); // q2 → exit path → loop (color 0)

  expect(step.state.type).toBe("in-loop");
  expect(step.context.data?.["__currentItem"]?.value).toBe("red");

  step = await traverse(step, { rating: 1 }); // red → blue
  step = await traverse(step, { rating: 2 }); // blue → green
  step = await traverse(step, { rating: 3 }); // green → exit loop → cp-done → debrief

  expect((step.state as any).node.id).toBe("screen-debrief");
  return step;
}

describe("complex experiment (all node types)", async () => {
  afterEach(() => vi.restoreAllMocks());

  it("completes full flow: google → minor → control path → loop → debrief", async () => {
    const step = await runComplexFlow("start-google", 15, "control");
    expect(step.context.start?.group).toBe("source=google");
    expect(step.context.branches?.["branch-age"]).toBe("minor");
    expect(step.context.forks?.["fork-group"]).toBe("control");
    expect(step.context.paths?.["path-control"]?.order).toEqual([
      "ctrl-q1",
      "ctrl-q2",
    ]);
    expect(step.context.data?.["__currentItem"]).toBeUndefined();
  });

  it("completes full flow: facebook → adult → treatment path → loop → debrief", async () => {
    const step = await runComplexFlow("start-facebook", 30, "treatment");
    expect(step.context.start?.group).toBe("source=facebook");
    expect(step.context.branches?.["branch-age"]).toBe("adult");
    expect(step.context.forks?.["fork-group"]).toBe("treatment");
    expect(step.context.paths?.["path-treatment"]?.order).toEqual([
      "tmt-q1",
      "tmt-q2",
    ]);
  });

  it("records all three checkpoints in context", async () => {
    const step = await runComplexFlow("start-google", 25, "control");
    expect(step.context.checkpoints?.["experiment-init"]).toBeDefined();
    expect(step.context.checkpoints?.["pre-experiment"]).toBeDefined();
    expect(step.context.checkpoints?.["experiment-done"]).toBeDefined();
  });

  it("accumulates screen data across all node types", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // control
    let step = await startExperiment(complexFlow, "start-google");
    step = await traverse(step, { viewed: true });
    step = await traverse(step, { age: 25 });
    step = await traverse(step, { consented: true });
    step = await traverse(step, { q1: "alpha" });
    step = await traverse(step, { q2: "beta" });
    step = await traverse(step, { rating: 5 });
    step = await traverse(step, { rating: 4 });
    step = await traverse(step, { rating: 3 });
    expect(step.context.data?.["profile"]).toEqual({ age: 25 });
    expect(step.context.data?.["ctrl-q1"]).toEqual({ q1: "alpha" });
    expect(step.context.data?.["ctrl-q2"]).toEqual({ q2: "beta" });
  });

  it("loop iterates through all 3 colors in the correct order", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // control
    let step = await startExperiment(complexFlow, "start-google");
    step = await traverse(step, { viewed: true });
    step = await traverse(step, { age: 25 });
    step = await traverse(step, { consented: true });
    step = await traverse(step, { q1: "a" });
    step = await traverse(step, { q2: "b" });
    const colors: string[] = [];
    while (step.state.type === "in-loop") {
      colors.push(step.context.data?.["__currentItem"]?.value);
      step = await traverse(step, { rated: true });
    }
    expect(colors).toEqual(["red", "blue", "green"]);
  });
});

// ---------------------------------------------------------------------------
// traverse no-op on "end" state
// ---------------------------------------------------------------------------

describe("traverse no-op on end state", async () => {
  const flow: ExperimentFlow = {
    nodes: [{ id: "start", type: "start" }, makeScreen("s1", "s1")],
    edges: [seq("start", "s1")],
  };

  it("returns the same step reference when already at end", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // s1 → end (no sequential edge out)
    expect(step.state.type).toBe("end");
    const again = await traverse(step, { extra: true });
    expect(again).toBe(step);
  });
});

// ---------------------------------------------------------------------------
// Start node without props → "default" group
// ---------------------------------------------------------------------------

describe("start node without props", async () => {
  it("records 'default' as the group when start node has no props", async () => {
    const flow: ExperimentFlow = {
      nodes: [{ id: "start", type: "start" }, makeScreen("s1", "s1")],
      edges: [seq("start", "s1")],
    };
    const step = await startExperiment(flow, "start");
    expect(step.context.start?.group).toBe("default");
  });
});

// ---------------------------------------------------------------------------
// Checkpoint at the end of the flow (no sequential edge out)
// ---------------------------------------------------------------------------

describe("checkpoint at end of flow", async () => {
  it("transitions to end state and records the timestamp", async () => {
    const flow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        makeScreen("s1", "s1"),
        { id: "cp-final", type: "checkpoint", props: { name: "final" } },
      ],
      edges: [seq("start", "s1"), seq("s1", "cp-final")],
    };
    const before = Date.now();
    let step = await startExperiment(flow, "start"); // on s1
    step = await traverse(step, {}); // s1 → cp-final (auto-traverses) → end
    const after = Date.now();

    expect(step.state.type).toBe("end");
    const ts = step.context.checkpoints?.["final"];
    expect(ts).toBeDefined();
    expect(new Date(ts!).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(ts!).getTime()).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// Path with randomized children
// ---------------------------------------------------------------------------

describe("path with randomized children", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      {
        id: "path-r",
        type: "path",
        props: { name: "Random", randomized: true },
      },
      makeScreen("s1", "slug1"),
      makeScreen("s2", "slug2"),
      makeScreen("s3", "slug3"),
    ],
    edges: [
      seq("start", "path-r"),
      { type: "path-contains", from: "path-r", to: "s1", order: 0 },
      { type: "path-contains", from: "path-r", to: "s2", order: 1 },
      { type: "path-contains", from: "path-r", to: "s3", order: 2 },
    ],
  };

  it("visits all children exactly once even when randomized", async () => {
    let step = await startExperiment(flow, "start");
    const seen: string[] = [];
    while (step.state.type === "in-path") {
      seen.push((step.state as any).innerState.node.props.slug);
      step = await traverse(step, {});
    }
    expect(seen.sort()).toEqual(["slug1", "slug2", "slug3"]);
  });

  it("tracks all slugs in context.paths order regardless of shuffle", async () => {
    let step = await startExperiment(flow, "start");
    while (step.state.type === "in-path") step = await traverse(step, {});
    const order = step.context.paths?.["path-r"]?.order ?? [];
    expect(order.sort()).toEqual(["slug1", "slug2", "slug3"]);
  });
});

// ---------------------------------------------------------------------------
// Loop tracking (context.loops)
// ---------------------------------------------------------------------------

describe("loop tracking (context.loops)", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      {
        id: "loop-colors",
        type: "loop",
        props: { type: "static", values: ["red", "blue", "green"] },
      },
      makeScreen("screen-color", "color"),
      makeScreen("screen-end", "end"),
    ],
    edges: [
      seq("start", "loop-colors"),
      { type: "loop-template", from: "loop-colors", to: "screen-color" },
      seq("loop-colors", "screen-end"),
    ],
  };

  it("tracks each completed iteration value incrementally", async () => {
    let step = await startExperiment(flow, "start"); // index 0: red
    step = await traverse(step, { rated: 1 }); // red done → advance to blue
    expect(step.context.loops?.["loop-colors"]?.order).toEqual(["red"]);
    step = await traverse(step, { rated: 2 }); // blue done → advance to green
    expect(step.context.loops?.["loop-colors"]?.order).toEqual(["red", "blue"]);
  });

  it("populates context.loops with all values after the loop exits", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, { rated: 1 });
    step = await traverse(step, { rated: 2 });
    step = await traverse(step, { rated: 3 }); // green done → exit
    expect(step.context.loops?.["loop-colors"]?.order).toEqual([
      "red",
      "blue",
      "green",
    ]);
  });

  it("loop tracking is preserved after exiting to the next screen", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {});
    step = await traverse(step, {});
    step = await traverse(step, {}); // exit loop → screen-end
    expect((step.state as any).node.id).toBe("screen-end");
    expect(step.context.loops?.["loop-colors"]?.order).toEqual([
      "red",
      "blue",
      "green",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Loop as a path child
// ---------------------------------------------------------------------------

describe("loop as a path child", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      { id: "path-outer", type: "path", props: { name: "Outer" } },
      makeScreen("s-before", "before"),
      {
        id: "loop-inner",
        type: "loop",
        props: { type: "static", values: ["a", "b"] },
      },
      makeScreen("s-loop-item", "item"),
      makeScreen("s-end", "end"),
    ],
    edges: [
      seq("start", "path-outer"),
      { type: "path-contains", from: "path-outer", to: "s-before", order: 0 },
      { type: "path-contains", from: "path-outer", to: "loop-inner", order: 1 },
      { type: "loop-template", from: "loop-inner", to: "s-loop-item" },
      seq("path-outer", "s-end"),
    ],
  };

  it("enters the loop after the preceding screen completes", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // submit s-before → path advances to loop-inner
    expect(step.state.type).toBe("in-path");
    expect((step.state as any).innerState.type).toBe("in-loop");
  });

  it("iterates through all loop values before exiting the path", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // before → loop (a)
    step = await traverse(step, {}); // item a → item b
    step = await traverse(step, {}); // item b → loop exits → path exits → s-end
    expect((step.state as any).node.id).toBe("s-end");
  });

  it("tracks the loop node id in context.paths order", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {}); // before
    step = await traverse(step, {}); // item a
    step = await traverse(step, {}); // item b → exit
    expect(step.context.paths?.["path-outer"]?.order).toEqual([
      "before",
      "loop-inner",
    ]);
  });

  it("also populates context.loops for the inner loop", async () => {
    let step = await startExperiment(flow, "start");
    step = await traverse(step, {});
    step = await traverse(step, {});
    step = await traverse(step, {});
    expect(step.context.loops?.["loop-inner"]?.order).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// Path order tracks every child type
// ---------------------------------------------------------------------------

describe("path order tracks all child node types", async () => {
  // path children: screen → branch → checkpoint
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      { id: "path-all", type: "path", props: { name: "Mixed" } },
      makeScreen("s-q1", "q1"),
      {
        id: "branch-lvl",
        type: "branch",
        props: {
          name: "Level",
          branches: [
            {
              id: "easy",
              name: "Easy",
              config: { operator: "eq", value: "easy", dataKey: "$$q1.level" },
            },
          ],
        },
      },
      makeScreen("s-easy", "easy-screen"),
      { id: "cp-mid", type: "checkpoint", props: { name: "mid" } },
      makeScreen("s-after-cp", "after-cp"),
      makeScreen("s-end", "end"),
    ],
    edges: [
      seq("start", "path-all"),
      { type: "path-contains", from: "path-all", to: "s-q1", order: 0 },
      { type: "path-contains", from: "path-all", to: "branch-lvl", order: 1 },
      { type: "path-contains", from: "path-all", to: "cp-mid", order: 2 },
      { type: "branch-condition", from: "branch-lvl.easy", to: "s-easy" },
      { type: "branch-default", from: "branch-lvl", to: "s-easy" },
      seq("cp-mid", "s-after-cp"),
      seq("path-all", "s-end"),
    ],
  };

  it("order contains slug for screen, id for branch, id for checkpoint", async () => {
    let step = await startExperiment(flow, "start"); // on s-q1
    step = await traverse(step, { level: "easy" }); // q1 done → branch-lvl pending
    step = await traverse(step, {}); // branch resolves → s-easy (inside path wrapper)
    step = await traverse(step, {}); // s-easy done → cp-mid pending
    step = await traverse(step, {}); // cp auto-traverses → s-after-cp (inside path wrapper)
    step = await traverse(step, {}); // s-after-cp done → path exits → s-end
    const order = step.context.paths?.["path-all"]?.order ?? [];
    expect(order).toEqual(["q1", "branch-lvl", "cp-mid"]);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe("error cases", async () => {
  it("throws when start node has no sequential edge out", async () => {
    const flow: ExperimentFlow = {
      nodes: [{ id: "start", type: "start" }],
      edges: [],
    };
    await expect(startExperiment(flow, "start")).rejects.toThrow(
      "Start node must have a next node",
    );
  });

  it("throws when path node has no path-contains children", async () => {
    const flow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        { id: "path-empty", type: "path", props: { name: "Empty" } },
      ],
      edges: [seq("start", "path-empty")],
    };
    await expect(startExperiment(flow, "start")).rejects.toThrow(
      "Path node must have child nodes",
    );
  });

  it("throws when loop node has no loop-template edge", async () => {
    const flow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        {
          id: "loop-bad",
          type: "loop",
          props: { type: "static", values: ["x"] },
        },
      ],
      edges: [seq("start", "loop-bad")],
    };
    await expect(startExperiment(flow, "start")).rejects.toThrow(
      "Loop node must have a template node",
    );
  });

  it("throws when branch has no matching condition and no default edge", async () => {
    const flow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        makeScreen("s-age", "age"),
        {
          id: "branch-age",
          type: "branch",
          props: {
            name: "Age branch",
            branches: [
              {
                id: "adult",
                name: "Adult",
                config: { operator: "gte", value: 18, dataKey: "$$age.age" },
              },
            ],
          },
        },
        makeScreen("s-adult", "adult"),
      ],
      edges: [
        seq("start", "s-age"),
        seq("s-age", "branch-age"),
        { type: "branch-condition", from: "branch-age.adult", to: "s-adult" },
        // intentionally no branch-default edge
      ],
    };
    const step = await startExperiment(flow, "start");
    await expect(traverse(step, { age: 5 })).rejects.toThrow(
      "Branch node must have a next node for the winning branch",
    );
  });

  it("throws when fork node has no fork-edge for the selected fork", async () => {
    const flow: ExperimentFlow = {
      nodes: [
        { id: "start", type: "start" },
        {
          id: "fork-bad",
          type: "fork",
          props: { forks: [{ id: "x", name: "X", weight: 1 }] },
        },
      ],
      edges: [seq("start", "fork-bad")],
    };
    await expect(startExperiment(flow, "start")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// evaluateCondition / getValue
// ---------------------------------------------------------------------------

describe("getValue", async () => {
  it("resolves a top-level key", async () => {
    const ctx = { data: { profile: { age: 30 } } };
    expect(getValue(ctx, "$$profile")).toEqual({ age: 30 });
  });

  it("resolves a nested key via dot notation", async () => {
    const ctx = { data: { profile: { age: 30 } } };
    expect(getValue(ctx, "$$profile.age")).toBe(30);
  });

  it("returns undefined for a missing key", async () => {
    const ctx = { data: {} };
    expect(getValue(ctx, "$$missing.field")).toBeUndefined();
  });

  it("returns undefined when context.data is absent", async () => {
    expect(getValue({}, "$$profile.age")).toBeUndefined();
  });

  it("throws when the key does not start with $$", async () => {
    expect(() => getValue({}, "profile.age" as any)).toThrow("Invalid key");
  });
});

// ---------------------------------------------------------------------------
// .then() chaining via next()
// ---------------------------------------------------------------------------

describe("next() — .then() chaining helper", async () => {
  const flow: ExperimentFlow = {
    nodes: [
      { id: "start", type: "start" },
      makeScreen("s-a", "a"),
      makeScreen("s-b", "b"),
      makeScreen("s-c", "c"),
    ],
    edges: [seq("start", "s-a"), seq("s-a", "s-b"), seq("s-b", "s-c")],
  };

  it("chains three screens with .then(next(...))", async () => {
    const step = await startExperiment(flow, "start")
      .then(next({ answer: 1 })) // s-a → s-b
      .then(next({ answer: 2 })) // s-b → s-c
      .then(next({ answer: 3 })); // s-c → end
    expect(step.state.type).toBe("end");
    expect(step.context.data?.["a"]).toEqual({ answer: 1 });
    expect(step.context.data?.["b"]).toEqual({ answer: 2 });
    expect(step.context.data?.["c"]).toEqual({ answer: 3 });
  });

  it("next() with no argument still advances (passes empty data)", async () => {
    const step = await startExperiment(flow, "start")
      .then(next())
      .then(next())
      .then(next());
    expect(step.state.type).toBe("end");
  });

  it("mixing .then(next()) with manual await traverse() produces the same result", async () => {
    const chained = await startExperiment(flow, "start")
      .then(next({ x: 1 }))
      .then(next({ x: 2 }))
      .then(next({ x: 3 }));

    let manual = await startExperiment(flow, "start");
    manual = await traverse(manual, { x: 1 });
    manual = await traverse(manual, { x: 2 });
    manual = await traverse(manual, { x: 3 });

    expect(chained.state).toEqual(manual.state);
    expect(chained.context).toEqual(manual.context);
  });
});

describe("evaluateCondition", async () => {
  const ctx = {
    data: {
      profile: { age: 25, name: "alice" },
      tags: { list: ["sport", "music"] },
      counts: { items: 3 },
    },
  };

  it("eq — matches equal value", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.name", value: "alice" },
        ctx,
      ),
    ).toBe(true);
  });

  it("eq — does not match different value", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.name", value: "bob" },
        ctx,
      ),
    ).toBe(false);
  });

  it("neq — matches when values differ", async () => {
    expect(
      evaluateCondition(
        { operator: "neq", dataKey: "$$profile.name", value: "bob" },
        ctx,
      ),
    ).toBe(true);
  });

  it("lt / lte / gt / gte numeric comparisons", async () => {
    const num = (op: any, v: number) =>
      evaluateCondition(
        { operator: op, dataKey: "$$profile.age", value: v },
        ctx,
      );
    expect(num("lt", 30)).toBe(true);
    expect(num("lt", 25)).toBe(false);
    expect(num("lte", 25)).toBe(true);
    expect(num("gt", 20)).toBe(true);
    expect(num("gt", 25)).toBe(false);
    expect(num("gte", 25)).toBe(true);
  });

  it("returns false when value is undefined for a base operator", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.missing", value: "x" },
        ctx,
      ),
    ).toBe(false);
  });

  it("contains — true when array includes the value", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$tags.list", value: "sport" },
        ctx,
      ),
    ).toBe(true);
  });

  it("contains — false when array does not include the value", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$tags.list", value: "cooking" },
        ctx,
      ),
    ).toBe(false);
  });

  it("contains — false when value is not an array", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$profile.age", value: 25 },
        ctx,
      ),
    ).toBe(false);
  });

  it("length-gt — true when array length exceeds threshold", async () => {
    expect(
      evaluateCondition(
        { operator: "length-gt", dataKey: "$$tags.list", value: 1 },
        ctx,
      ),
    ).toBe(true);
  });

  it("length-lte — true when string length is within threshold", async () => {
    expect(
      evaluateCondition(
        { operator: "length-lte", dataKey: "$$profile.name", value: 5 },
        ctx,
      ),
    ).toBe(true); // "alice".length === 5
  });
});
