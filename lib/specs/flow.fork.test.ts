import { afterEach, describe, expect, it, vi } from "vitest";
import { startExperiment, traverse } from "../flow";
import { ExperimentFlow } from "../types";
import { makeScreen, seq } from "./test-helpers";

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
