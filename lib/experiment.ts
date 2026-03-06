import { ExperimentFlow } from "./types";

export const experiment: ExperimentFlow = {
  nodes: [
    {
      id: "start-google",
      type: "start",
      props: {
        name: "Start from a google link",
        param: { key: "source", value: "google" },
      },
    },
    {
      id: "start-facebook",
      type: "start",
      props: {
        name: "Start from a facebook link",
        param: { key: "source", value: "facebook" },
      },
    },
    // Intro
    {
      id: "screen-intro",
      type: "screen",
      props: {
        slug: "intro-screen",
      },
    },
    // Regressors path
    {
      id: "path-regressors",
      type: "path",
      props: {
        name: "Regressors",
        description: "This path contains all the regressor nodes",
        randomized: false,
        stepper: { label: "{index} of {total}", style: "dashed" },
      },
    },
    // Regressor screens
    {
      id: "screen-regressors-age",
      type: "screen",
      props: {
        slug: "regressors-age-screen",
      },
    },
    {
      id: "screen-regressors-gender",
      type: "screen",
      props: {
        slug: "regressors-gender-screen",
      },
    },
    {
      id: "screen-regressors-location",
      type: "screen",
      props: {
        slug: "regressors-location-screen",
      },
    },
    // Age related branch
    {
      id: "branch-age",
      type: "branch",
      props: {
        name: "Age branch",
        description: "Branch based on age groups",
        branches: [
          {
            id: "under-18",
            name: "Under 18",
            config: {
              operator: "lt",
              value: 18,
              dataKey: "$$path-regressors.regressors-age-screen.age",
            },
          },
          {
            id: "over-18",
            name: "18 and over",
            config: {
              operator: "gte",
              value: 18,
              dataKey: "$$path-regressors.regressors-age-screen.age",
            },
          },
        ],
      },
    },
    // Under 18 screen
    {
      id: "screen-under-18",
      type: "screen",
      props: {
        slug: "under-18-screen",
      },
    },
    // Over 18 screen
    {
      id: "screen-over-18",
      type: "screen",
      props: {
        slug: "over-18-screen",
      },
    },
    // Checkpoint
    {
      id: "first-checkpoint",
      type: "checkpoint",
      props: {
        name: "First checkpoint",
      },
    },
    // Finish screen
    {
      id: "screen-finish",
      type: "screen",
      props: {
        slug: "finish-screen",
      },
    },
  ],
  edges: [
    // Start edges
    { type: "sequential", from: "start-google", to: "screen-intro" },
    { type: "sequential", from: "start-facebook", to: "screen-intro" },
    // Intro to regressors path
    { type: "sequential", from: "screen-intro", to: "path-regressors" },
    // Path containment edges for regressors
    {
      type: "path-contains",
      from: "path-regressors",
      to: "screen-regressors-age",
      order: 0,
    },
    {
      type: "path-contains",
      from: "path-regressors",
      to: "screen-regressors-gender",
      order: 1,
    },
    {
      type: "path-contains",
      from: "path-regressors",
      to: "screen-regressors-location",
      order: 2,
    },
    // Path to branch
    { type: "sequential", from: "path-regressors", to: "branch-age" },
    // Branch condition edges; branch-default always present as explicit fallback
    {
      type: "branch-condition",
      from: "branch-age.under-18",
      to: "screen-under-18",
    },
    {
      type: "branch-condition",
      from: "branch-age.over-18",
      to: "screen-over-18",
    },
    { type: "branch-default", from: "branch-age", to: "screen-over-18" },
    // Sequential edges to checkpoint
    { type: "sequential", from: "screen-under-18", to: "first-checkpoint" },
    { type: "sequential", from: "screen-over-18", to: "first-checkpoint" },
    // Sequential edge to finish
    { type: "sequential", from: "first-checkpoint", to: "screen-finish" },
  ],
};
