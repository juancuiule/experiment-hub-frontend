import { ExperimentFlow } from "@/lib/types";

// Daily Habits & Wellbeing Check-in
//
// Flow:
//   start
//   → screen-welcome          (name input)
//   → path-profile            (stepper, 2 screens)
//       screen-demographics   (age + city inputs)
//       screen-activities     (checkbox: pick daily activities)
//   → checkpoint-profile
//   → branch-engagement       (length-gte 3 activities?)
//       engaged →  screen-high-engagement  (overall satisfaction rating)
//       default →  screen-low-engagement   (aspiration input)
//   → loop-activities         (dynamic: selected activities)
//       screen-activity-detail  (@value labels: enjoyment + consistency ratings)
//   → checkpoint-complete
export const experiment: ExperimentFlow = {
  nodes: [
    { id: "start", type: "start" },

    { id: "screen-welcome", type: "screen", props: { slug: "welcome" } },

    {
      id: "path-profile",
      type: "path",
      props: { name: "Profile", stepper: { style: "dashed" } },
    },
    { id: "screen-demographics", type: "screen", props: { slug: "demographics" } },
    { id: "screen-activities", type: "screen", props: { slug: "activities" } },

    { id: "checkpoint-profile", type: "checkpoint", props: { name: "profile-complete" } },

    {
      id: "branch-engagement",
      type: "branch",
      props: {
        name: "Engagement level",
        branches: [
          {
            id: "engaged",
            name: "Highly engaged",
            config: {
              operator: "length-gte",
              dataKey: "$$path-profile.activities.activities",
              value: 3,
            },
          },
        ],
      },
    },
    { id: "screen-high-engagement", type: "screen", props: { slug: "high-engagement" } },
    { id: "screen-low-engagement", type: "screen", props: { slug: "low-engagement" } },

    {
      id: "loop-activities",
      type: "loop",
      props: {
        type: "dynamic",
        dataKey: "$$path-profile.activities.activities",
        stepper: { label: "Activity {index} of {total}", style: "dashed" },
      },
    },
    { id: "screen-activity-detail", type: "screen", props: { slug: "activity-detail" } },

    { id: "checkpoint-complete", type: "checkpoint", props: { name: "complete" } },
  ],

  edges: [
    { type: "sequential", from: "start", to: "screen-welcome" },
    { type: "sequential", from: "screen-welcome", to: "path-profile" },

    { type: "path-contains", from: "path-profile", to: "screen-demographics", order: 0 },
    { type: "path-contains", from: "path-profile", to: "screen-activities", order: 1 },

    { type: "sequential", from: "path-profile", to: "checkpoint-profile" },
    { type: "sequential", from: "checkpoint-profile", to: "branch-engagement" },

    { type: "branch-condition", from: "branch-engagement.engaged", to: "screen-high-engagement" },
    { type: "branch-default", from: "branch-engagement", to: "screen-low-engagement" },

    { type: "sequential", from: "screen-high-engagement", to: "loop-activities" },
    { type: "sequential", from: "screen-low-engagement", to: "loop-activities" },

    { type: "loop-template", from: "loop-activities", to: "screen-activity-detail" },
    { type: "sequential", from: "loop-activities", to: "checkpoint-complete" },
  ],

  screens: [
    {
      slug: "welcome",
      components: [
        {
          type: "input",
          dataKey: "name",
          label: "What's your name?",
          placeholder: "Your name",
        },
        { type: "button", label: "Begin" },
      ],
    },
    {
      slug: "demographics",
      components: [
        {
          type: "input",
          dataKey: "age",
          label: "How old are you?",
          placeholder: "e.g. 28",
        },
        {
          type: "input",
          dataKey: "city",
          label: "What city do you live in?",
          placeholder: "e.g. Buenos Aires",
        },
        { type: "button", label: "Next" },
      ],
    },
    {
      slug: "activities",
      components: [
        {
          type: "checkbox-group",
          dataKey: "activities",
          label: "Which activities are part of your daily routine?",
          options: [
            { label: "Exercise", value: "exercise" },
            { label: "Cooking", value: "cooking" },
            { label: "Reading", value: "reading" },
            { label: "Meditation", value: "meditation" },
            { label: "Outdoor walks", value: "outdoor-walks" },
          ],
        },
        { type: "button", label: "Next" },
      ],
    },
    {
      slug: "high-engagement",
      components: [
        {
          type: "rating",
          dataKey: "overall-satisfaction",
          label: "Nice work, $$welcome.name! How satisfied are you with your current routine overall?",
          scale: 5,
        },
        { type: "button", label: "Continue" },
      ],
    },
    {
      slug: "low-engagement",
      components: [
        {
          type: "input",
          dataKey: "aspiration",
          label: "Hi $$welcome.name! What's one habit you'd like to build?",
          placeholder: "e.g. morning walks",
        },
        { type: "button", label: "Continue" },
      ],
    },
    {
      slug: "activity-detail",
      components: [
        {
          type: "rating",
          dataKey: "enjoyment",
          label: "How much do you enjoy @value?",
          scale: 5,
        },
        {
          type: "rating",
          dataKey: "consistency",
          label: "How consistent are you with @value?",
          scale: 5,
        },
        { type: "button", label: "Next" },
      ],
    },
  ],
};

// export const experiment: ExperimentFlow = {
//   nodes: [
//     // ── Entry ──────────────────────────────────────────────────────────────
//     { id: "start", type: "start" },

//     // A/B fork: 70 % variant-a, 30 % variant-b
//     {
//       id: "fork-intro",
//       type: "fork",
//       props: {
//         forks: [
//           { id: "variant-a", name: "Variant A", weight: 7 },
//           { id: "variant-b", name: "Variant B", weight: 3 },
//         ],
//       },
//     },
//     { id: "screen-intro-a", type: "screen", props: { slug: "intro-a" } },
//     { id: "screen-intro-b", type: "screen", props: { slug: "intro-b" } },
//     { id: "screen-consent", type: "screen", props: { slug: "consent" } },

//     // ── Demographics path ──────────────────────────────────────────────────
//     {
//       id: "path-demographics",
//       type: "path",
//       props: { name: "Demographics", randomized: false },
//     },
//     {
//       id: "screen-demographics-age",
//       type: "screen",
//       props: { slug: "demographics-age" },
//     },
//     {
//       id: "screen-demographics-gender",
//       type: "screen",
//       props: { slug: "demographics-gender" },
//     },
//     {
//       id: "screen-demographics-country",
//       type: "screen",
//       props: { slug: "demographics-country" },
//     },

//     // Age gate: minors exit early
//     {
//       id: "branch-age-gate",
//       type: "branch",
//       props: {
//         name: "Age gate",
//         branches: [
//           {
//             id: "minor",
//             name: "Under 18",
//             config: {
//               operator: "lt",
//               value: 18,
//               dataKey: "$$path-demographics.demographics-age.age",
//             },
//           },
//         ],
//       },
//     },
//     { id: "screen-minor-exit", type: "screen", props: { slug: "minor-exit" } },

//     // ── Checkpoint ─────────────────────────────────────────────────────────
//     {
//       id: "checkpoint-demographics",
//       type: "checkpoint",
//       props: { name: "demographics-complete" },
//     },

//     // ── Health assessment path (order randomized per user) ─────────────────
//     {
//       id: "path-health",
//       type: "path",
//       props: { name: "Health Assessment", randomized: true },
//     },
//     {
//       id: "screen-physical-activity",
//       type: "screen",
//       props: { slug: "physical-activity" },
//     },
//     {
//       id: "screen-sleep-quality",
//       type: "screen",
//       props: { slug: "sleep-quality" },
//     },
//     {
//       id: "screen-stress-level",
//       type: "screen",
//       props: { slug: "stress-level" },
//     },

//     // Risk branch based on stress score
//     {
//       id: "branch-risk",
//       type: "branch",
//       props: {
//         name: "Risk level",
//         branches: [
//           {
//             id: "high-stress",
//             name: "High stress",
//             config: {
//               operator: "gte",
//               value: 7,
//               dataKey: "$$path-health.stress-level.level",
//             },
//           },
//         ],
//       },
//     },
//     {
//       id: "screen-high-stress-resources",
//       type: "screen",
//       props: { slug: "high-stress-resources" },
//     },
//     {
//       id: "screen-standard-resources",
//       type: "screen",
//       props: { slug: "standard-resources" },
//     },

//     // ── Goals loop (static values) ─────────────────────────────────────────
//     {
//       id: "loop-goals",
//       type: "loop",
//       props: {
//         type: "static",
//         values: ["nutrition", "fitness", "mindfulness"],
//       },
//     },
//     { id: "screen-goal-item", type: "screen", props: { slug: "goal-item" } },

//     // ── Final checkpoint + results ─────────────────────────────────────────
//     {
//       id: "checkpoint-complete",
//       type: "checkpoint",
//       props: { name: "assessment-complete" },
//     },
//     { id: "screen-results", type: "screen", props: { slug: "results" } },
//   ],
//   edges: [
//     // Entry → A/B fork → intro screens → consent
//     { type: "sequential", from: "start", to: "fork-intro" },
//     { type: "fork-edge", from: "fork-intro.variant-a", to: "screen-intro-a" },
//     { type: "fork-edge", from: "fork-intro.variant-b", to: "screen-intro-b" },
//     { type: "sequential", from: "screen-intro-a", to: "screen-consent" },
//     { type: "sequential", from: "screen-intro-b", to: "screen-consent" },

//     // Consent → demographics path
//     { type: "sequential", from: "screen-consent", to: "path-demographics" },
//     {
//       type: "path-contains",
//       from: "path-demographics",
//       to: "screen-demographics-age",
//       order: 0,
//     },
//     {
//       type: "path-contains",
//       from: "path-demographics",
//       to: "screen-demographics-gender",
//       order: 1,
//     },
//     {
//       type: "path-contains",
//       from: "path-demographics",
//       to: "screen-demographics-country",
//       order: 2,
//     },

//     // Demographics → age gate branch
//     { type: "sequential", from: "path-demographics", to: "branch-age-gate" },
//     {
//       type: "branch-condition",
//       from: "branch-age-gate.minor",
//       to: "screen-minor-exit",
//     },
//     // minors end here (no sequential from screen-minor-exit)
//     {
//       type: "branch-default",
//       from: "branch-age-gate",
//       to: "checkpoint-demographics",
//     },

//     // Checkpoint → health path
//     { type: "sequential", from: "checkpoint-demographics", to: "path-health" },
//     {
//       type: "path-contains",
//       from: "path-health",
//       to: "screen-physical-activity",
//       order: 0,
//     },
//     {
//       type: "path-contains",
//       from: "path-health",
//       to: "screen-sleep-quality",
//       order: 1,
//     },
//     {
//       type: "path-contains",
//       from: "path-health",
//       to: "screen-stress-level",
//       order: 2,
//     },

//     // Health → risk branch
//     { type: "sequential", from: "path-health", to: "branch-risk" },
//     {
//       type: "branch-condition",
//       from: "branch-risk.high-stress",
//       to: "screen-high-stress-resources",
//     },
//     {
//       type: "branch-default",
//       from: "branch-risk",
//       to: "screen-standard-resources",
//     },

//     // Both resource screens → goals loop
//     {
//       type: "sequential",
//       from: "screen-high-stress-resources",
//       to: "loop-goals",
//     },
//     { type: "sequential", from: "screen-standard-resources", to: "loop-goals" },

//     // Goals loop
//     { type: "loop-template", from: "loop-goals", to: "screen-goal-item" },
//     { type: "sequential", from: "loop-goals", to: "checkpoint-complete" },

//     // Final checkpoint → results
//     { type: "sequential", from: "checkpoint-complete", to: "screen-results" },
//   ],
// };
