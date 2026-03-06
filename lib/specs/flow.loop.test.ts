import { describe, expect, it } from "vitest";
import { startExperiment, traverse } from "../flow";
import { ExperimentFlow } from "../types";
import { makeScreen, seq } from "../test-helpers";

// ---------------------------------------------------------------------------
// Loop (static values)
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
// Loop (dynamic values from context)
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

  it("sets full order upfront when the loop is entered", async () => {
    let step = await startExperiment(flow, "start"); // index 0: red
    expect(step.context.loops?.["loop-colors"]?.order).toEqual(["red", "blue", "green"]);
    step = await traverse(step, { rated: 1 }); // red done → advance to blue
    expect(step.context.loops?.["loop-colors"]?.order).toEqual(["red", "blue", "green"]);
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
