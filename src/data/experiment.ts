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
    {
      id: "screen-demographics",
      type: "screen",
      props: { slug: "demographics" },
    },
    { id: "screen-activities", type: "screen", props: { slug: "activities" } },

    {
      id: "checkpoint-profile",
      type: "checkpoint",
      props: { name: "profile-complete" },
    },

    {
      id: "branch-soccer",
      type: "branch",
      props: {
        name: "Soccer fan",
        branches: [
          {
            id: "fan",
            name: "Plays soccer",
            config: {
              operator: "contains",
              dataKey: "$$path-profile.activities.activities",
              value: "soccer",
            },
          },
        ],
      },
    },
    { id: "screen-soccer-club", type: "screen", props: { slug: "soccer-club" } },

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
    {
      id: "screen-high-engagement",
      type: "screen",
      props: { slug: "high-engagement" },
    },
    {
      id: "screen-low-engagement",
      type: "screen",
      props: { slug: "low-engagement" },
    },

    {
      id: "loop-activities",
      type: "loop",
      props: {
        type: "dynamic",
        dataKey: "$$path-profile.activities.activities",
        stepper: { label: "Activity {index} of {total}", style: "dashed" },
      },
    },
    {
      id: "screen-activity-detail",
      type: "screen",
      props: { slug: "activity-detail" },
    },

    {
      id: "checkpoint-complete",
      type: "checkpoint",
      props: { name: "complete" },
    },
  ],

  edges: [
    { type: "sequential", from: "start", to: "screen-welcome" },
    { type: "sequential", from: "screen-welcome", to: "path-profile" },

    {
      type: "path-contains",
      from: "path-profile",
      to: "screen-demographics",
      order: 0,
    },
    {
      type: "path-contains",
      from: "path-profile",
      to: "screen-activities",
      order: 1,
    },

    { type: "sequential", from: "path-profile", to: "checkpoint-profile" },
    { type: "sequential", from: "checkpoint-profile", to: "branch-soccer" },
    { type: "branch-condition", from: "branch-soccer.fan", to: "screen-soccer-club" },
    { type: "branch-default", from: "branch-soccer", to: "branch-engagement" },
    { type: "sequential", from: "screen-soccer-club", to: "branch-engagement" },

    {
      type: "branch-condition",
      from: "branch-engagement.engaged",
      to: "screen-high-engagement",
    },
    {
      type: "branch-default",
      from: "branch-engagement",
      to: "screen-low-engagement",
    },

    {
      type: "sequential",
      from: "screen-high-engagement",
      to: "loop-activities",
    },
    {
      type: "sequential",
      from: "screen-low-engagement",
      to: "loop-activities",
    },

    {
      type: "loop-template",
      from: "loop-activities",
      to: "screen-activity-detail",
    },
    { type: "sequential", from: "loop-activities", to: "checkpoint-complete" },
  ],

  screens: [
    {
      slug: "welcome",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: {
            content:
              "## Welcome!\nLet's start with a quick check-in about your daily habits and wellbeing.",
          },
        },
        {
          componentFamily: "response",
          template: "text-input",
          props: {
            dataKey: "name",
            label: "What's your name?",
            placeholder: "Your name",
            required: true,
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Begin" } },
      ],
    },
    {
      slug: "demographics",
      components: [
        {
          componentFamily: "response",
          template: "text-input",
          props: {
            dataKey: "age",
            label: "How old are you?",
            placeholder: "e.g. 28",
            required: true,
          },
        },
        {
          componentFamily: "response",
          template: "text-input",
          props: {
            dataKey: "city",
            label: "What city do you live in?",
            placeholder: "e.g. Buenos Aires",
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Next" } },
      ],
    },
    {
      slug: "activities",
      components: [
        {
          componentFamily: "response",
          template: "multiple-check",
          props: {
            dataKey: "activities",
            label: "Which activities are part of your daily routine?",
            required: true,
            options: [
              { label: "Exercise", value: "exercise" },
              { label: "Soccer", value: "soccer" },
              { label: "Cooking", value: "cooking" },
              { label: "Reading", value: "reading" },
              { label: "Meditation", value: "meditation" },
              { label: "Outdoor walks", value: "outdoor-walks" },
            ],
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Next" } },
      ],
    },
    {
      slug: "soccer-club",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: { content: "## You play soccer!\nWe'd love to know a bit more." },
        },
        {
          componentFamily: "response",
          template: "text-input",
          props: {
            dataKey: "club",
            label: "Which club are you a fan of?",
            placeholder: "e.g. River Plate",
            required: true,
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Next" } },
      ],
    },
    {
      slug: "high-engagement",
      components: [
        {
          componentFamily: "response",
          template: "rating",
          props: {
            dataKey: "overall-satisfaction",
            label:
              "Nice work, $$welcome.name! How satisfied are you with your current routine overall?",
            max: 5,
            required: true,
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Continue" } },
      ],
    },
    {
      slug: "low-engagement",
      components: [
        {
          componentFamily: "response",
          template: "text-input",
          props: {
            dataKey: "aspiration",
            label: "Hi $$welcome.name! What's one habit you'd like to build?",
            placeholder: "e.g. morning walks",
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Continue" } },
      ],
    },
    {
      slug: "activity-detail",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: {
            content:
              "## @value\nTell us a bit about how this activity fits into your life.",
          },
        },
        {
          componentFamily: "response",
          template: "rating",
          props: {
            dataKey: "enjoyment",
            label: "How much do you enjoy @value?",
            max: 5,
            required: true,
          },
        },
        {
          componentFamily: "response",
          template: "rating",
          props: {
            dataKey: "consistency",
            label: "How consistent are you with @value?",
            max: 5,
            required: true,
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Next" } },
      ],
    },
  ],
};
