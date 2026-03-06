import { ExperimentFlow } from "./types";

// Simple experiment to test dynamic loops.
// 1. Ask the user which sports they play (produces a string[]).
// 2. Loop over each sport and ask how much joy it brings them and
// how many times they played it on the last week.
export const experimentLoop: ExperimentFlow = {
  nodes: [
    { id: "start", type: "start" },
    { id: "screen-sports", type: "screen", props: { slug: "sports" } },
    {
      id: "loop-sports",
      type: "loop",
      props: { type: "dynamic", dataKey: "$$sports.sports" },
    },
    { id: "screen-sport-joy", type: "screen", props: { slug: "sport-joy" } },
    { id: "screen-sport-times", type: "screen", props: { slug: "sport-time" } },
    { id: "screen-results", type: "screen", props: { slug: "results" } },
  ],
  edges: [
    { type: "sequential", from: "start", to: "screen-sports" },
    { type: "sequential", from: "screen-sports", to: "loop-sports" },
    { type: "loop-template", from: "loop-sports", to: "screen-sport-joy" },
    { type: "sequential", from: "screen-sport-joy", to: "screen-sport-times" },

    { type: "sequential", from: "loop-sports", to: "screen-results" },
  ],
};

/*
=> start
=> screen-sports
=> for each sport
  => screen-sport-joy => screen-sport-times
  ... next sport
=> screen-results
*/