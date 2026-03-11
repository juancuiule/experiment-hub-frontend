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
// export const experiment: ExperimentFlow = {
//   nodes: [
//     { id: "start", type: "start" },

//     { id: "screen-welcome", type: "screen", props: { slug: "welcome" } },

//     {
//       id: "path-profile",
//       type: "path",
//       props: { name: "Profile", stepper: { style: "dashed", label: `{index} - {total}` } },
//     },
//     {
//       id: "screen-demographics",
//       type: "screen",
//       props: { slug: "demographics" },
//     },
//     { id: "screen-activities", type: "screen", props: { slug: "activities" } },

//     {
//       id: "checkpoint-profile",
//       type: "checkpoint",
//       props: { name: "profile-complete" },
//     },

//     {
//       id: "branch-soccer",
//       type: "branch",
//       props: {
//         name: "Soccer fan",
//         branches: [
//           {
//             id: "fan",
//             name: "Plays soccer",
//             config: {
//               operator: "contains",
//               dataKey: "$$path-profile.activities.activities",
//               value: "soccer",
//             },
//           },
//         ],
//       },
//     },
//     { id: "screen-soccer-club", type: "screen", props: { slug: "soccer-club" } },

//     {
//       id: "branch-engagement",
//       type: "branch",
//       props: {
//         name: "Engagement level",
//         branches: [
//           {
//             id: "engaged",
//             name: "Highly engaged",
//             config: {
//               operator: "length-gte",
//               dataKey: "$$path-profile.activities.activities",
//               value: 3,
//             },
//           },
//         ],
//       },
//     },
//     {
//       id: "screen-high-engagement",
//       type: "screen",
//       props: { slug: "high-engagement" },
//     },
//     {
//       id: "screen-low-engagement",
//       type: "screen",
//       props: { slug: "low-engagement" },
//     },

//     {
//       id: "loop-activities",
//       type: "loop",
//       props: {
//         type: "dynamic",
//         dataKey: "$$path-profile.activities.activities",
//         stepper: { label: "Activity {index} of {total}", style: "dashed" },
//       },
//     },
//     {
//       id: "screen-activity-detail",
//       type: "screen",
//       props: { slug: "activity-detail" },
//     },

//     {
//       id: "checkpoint-complete",
//       type: "checkpoint",
//       props: { name: "complete" },
//     },
//   ],

//   edges: [
//     { type: "sequential", from: "start", to: "screen-welcome" },
//     { type: "sequential", from: "screen-welcome", to: "path-profile" },

//     {
//       type: "path-contains",
//       from: "path-profile",
//       to: "screen-demographics",
//       order: 0,
//     },
//     {
//       type: "path-contains",
//       from: "path-profile",
//       to: "screen-activities",
//       order: 1,
//     },

//     { type: "sequential", from: "path-profile", to: "checkpoint-profile" },
//     { type: "sequential", from: "checkpoint-profile", to: "branch-soccer" },
//     { type: "branch-condition", from: "branch-soccer.fan", to: "screen-soccer-club" },
//     { type: "branch-default", from: "branch-soccer", to: "branch-engagement" },
//     { type: "sequential", from: "screen-soccer-club", to: "branch-engagement" },

//     {
//       type: "branch-condition",
//       from: "branch-engagement.engaged",
//       to: "screen-high-engagement",
//     },
//     {
//       type: "branch-default",
//       from: "branch-engagement",
//       to: "screen-low-engagement",
//     },

//     {
//       type: "sequential",
//       from: "screen-high-engagement",
//       to: "loop-activities",
//     },
//     {
//       type: "sequential",
//       from: "screen-low-engagement",
//       to: "loop-activities",
//     },

//     {
//       type: "loop-template",
//       from: "loop-activities",
//       to: "screen-activity-detail",
//     },
//     { type: "sequential", from: "loop-activities", to: "checkpoint-complete" },
//   ],

//   screens: [
//     {
//       slug: "welcome",
//       components: [
//         {
//           componentFamily: "content",
//           template: "rich-text",
//           props: {
//             content:
//               "## Welcome!\nLet's start with a quick check-in about your daily habits and wellbeing.",
//           },
//         },
//         {
//           componentFamily: "response",
//           template: "text-input",
//           props: {
//             dataKey: "name",
//             label: "What's your name?",
//             placeholder: "Your name",
//             required: true,
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Begin" } },
//       ],
//     },
//     {
//       slug: "demographics",
//       components: [
//         {
//           componentFamily: "response",
//           template: "text-input",
//           props: {
//             dataKey: "age",
//             label: "How old are you?",
//             placeholder: "e.g. 28",
//             required: true,
//           },
//         },
//         {
//           componentFamily: "response",
//           template: "text-input",
//           props: {
//             dataKey: "city",
//             label: "What city do you live in?",
//             placeholder: "e.g. Buenos Aires",
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Next" } },
//       ],
//     },
//     {
//       slug: "activities",
//       components: [
//         {
//           componentFamily: "response",
//           template: "checkboxes",
//           props: {
//             dataKey: "activities",
//             label: "Which activities are part of your daily routine?",
//             required: true,
//             options: [
//               { label: "Exercise", value: "exercise" },
//               { label: "Soccer", value: "soccer" },
//               { label: "Cooking", value: "cooking" },
//               { label: "Reading", value: "reading" },
//               { label: "Meditation", value: "meditation" },
//               { label: "Outdoor walks", value: "outdoor-walks" },
//             ],
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Next" } },
//       ],
//     },
//     {
//       slug: "soccer-club",
//       components: [
//         {
//           componentFamily: "content",
//           template: "rich-text",
//           props: { content: "## You play soccer!\nWe'd love to know a bit more." },
//         },
//         {
//           componentFamily: "response",
//           template: "text-input",
//           props: {
//             dataKey: "club",
//             label: "Which club are you a fan of?",
//             placeholder: "e.g. River Plate",
//             required: true,
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Next" } },
//       ],
//     },
//     {
//       slug: "high-engagement",
//       components: [
//         {
//           componentFamily: "response",
//           template: "likert-scale",
//           props: {
//             dataKey: "overall-satisfaction",
//             label:
//               "Nice work, $$welcome.name! How satisfied are you with your current routine overall?",
//             options: [
//               { label: "Very dissatisfied", value: "1" },
//               { label: "Dissatisfied", value: "2" },
//               { label: "Neutral", value: "3" },
//               { label: "Satisfied", value: "4" },
//               { label: "Very satisfied", value: "5" },
//             ],
//             required: true,
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Continue" } },
//       ],
//     },
//     {
//       slug: "low-engagement",
//       components: [
//         {
//           componentFamily: "response",
//           template: "text-input",
//           props: {
//             dataKey: "aspiration",
//             label: "Hi $$welcome.name! What's one habit you'd like to build?",
//             placeholder: "e.g. morning walks",
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Continue" } },
//       ],
//     },
//     {
//       slug: "activity-detail",
//       components: [
//         {
//           componentFamily: "content",
//           template: "rich-text",
//           props: {
//             content:
//               "## @value\nTell us a bit about how this activity fits into your life.",
//           },
//         },
//         {
//           componentFamily: "response",
//           template: "likert-scale",
//           props: {
//             dataKey: "enjoyment",
//             label: "How much do you enjoy @value?",
//             options: [
//               { label: "Not at all", value: "1" },
//               { label: "Slightly", value: "2" },
//               { label: "Moderately", value: "3" },
//               { label: "Very much", value: "4" },
//               { label: "Extremely", value: "5" },
//             ],
//             required: true,
//           },
//         },
//         {
//           componentFamily: "response",
//           template: "likert-scale",
//           props: {
//             dataKey: "consistency",
//             label: "How consistent are you with @value?",
//             options: [
//               { label: "Never", value: "1" },
//               { label: "Rarely", value: "2" },
//               { label: "Sometimes", value: "3" },
//               { label: "Often", value: "4" },
//               { label: "Always", value: "5" },
//             ],
//             required: true,
//           },
//         },
//         { componentFamily: "layout", template: "button", props: { text: "Next" } },
//       ],
//     },
//   ],
// };

export const experiment: ExperimentFlow = {
  nodes: [
    { id: "start", type: "start" },
    { id: "screen-welcome", type: "screen", props: { slug: "welcome" } },
    { id: "screen-starting", type: "screen", props: { slug: "starting" } },
    {
      id: "screen-psychodelics",
      type: "screen",
      props: { slug: "psychodelics" },
    },
    {
      id: "branch-psychedelics",
      type: "branch",
      props: {
        name: "Psychedelics consumption",
        branches: [
          {
            id: "consumed",
            name: "Consumed psychedelics",
            config: {
              operator: "length-gte",
              dataKey: "$$psychodelics.psychedelics",
              value: 1,
            },
          },
          {
            id: "not-consumed",
            name: "Did not consume psychedelics",
            config: {
              operator: "length-lt",
              dataKey: "$$psychodelics.psychedelics",
              value: 1,
            },
          },
        ],
      },
    },
    {
      id: "screen-psychedelics-experience",
      type: "screen",
      props: { slug: "psychedelics-experience" },
    },
    { id: "screen-thank-you", type: "screen", props: { slug: "thank-you" } },
  ],
  edges: [
    { type: "sequential", from: "start", to: "screen-welcome" },
    { type: "sequential", from: "screen-welcome", to: "screen-starting" },
    { type: "sequential", from: "screen-starting", to: "screen-psychodelics" },
    {
      type: "sequential",
      from: "screen-psychodelics",
      to: "branch-psychedelics",
    },
    {
      type: "branch-condition",
      from: "branch-psychedelics.consumed",
      to: "screen-psychedelics-experience",
    },
    {
      type: "branch-condition",
      from: "branch-psychedelics.not-consumed",
      to: "screen-thank-you",
    },
    {
      type: "branch-default",
      from: "branch-psychedelics",
      to: "screen-thank-you",
    },
    {
      type: "sequential",
      from: "screen-psychedelics-experience",
      to: "screen-thank-you",
    },
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
              "# Pandemia, conciencias y sustancias\n\n El objetivo de este experimento es tratar de entender mejor cómo algunos aspectos de nuestra personalidad, la realización (o no) de práctica contemplativas como el rezo y la meditación y el consumo (o no) de distintas sustancias psicoactivas se relacionan con la forma en la que atravesamos el aislamiento durante la pandemia.\n\n Esta encuesta no está dirigida específicamente a meditadores expertas, practicantes religiosos o consumidores de estas sustancias, sino que nos interesa entender a las personas y sus conciencia en toda su diversidad, y cómo se relaciona esa diversidad con el espectro de posibles reacciones ante la situación actual.  Mientras más distintas seamos las personas participantes, más vamos a poder aprender.\n\n Tu participación es voluntaria y todos tus datos están anonimizados y van a ser usados para intentar construir conocimiento científico nuevo. \n\n La finalidad del estudio es puramente académica y de ninguna manera incentiva al consumo de sustancias psicoactivas, aunque tampoco lo juzgamos. Estamos para aprender.",
          },
        },
        {
          componentFamily: "response",
          template: "single-checkbox",
          props: {
            label: "Estoy de acuerdo y acepto participar de la encuesta.",
            dataKey: "consent",
            required: true,
            shouldBe: true,
            defaultValue: false,
          },
        },
        {
          componentFamily: "control",
          template: "conditional",
          props: {
            component: {
              componentFamily: "layout",
              template: "button",
              props: { text: "Comenzar" },
            },
            if: {
              operator: "eq",
              dataKey: "$consent",
              value: true,
            },
            else: {
              componentFamily: "layout",
              template: "button",
              props: { text: "Comenzar", disabled: true },
            },
          },
        },
      ],
    },
    {
      slug: "starting",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: { content: "## Para empezar:" },
        },
        {
          componentFamily: "response",
          template: "slider",
          props: {
            dataKey: "religiosity",
            label: "¿Cuán religioso/a te considerás?",
            minLabel: "Nada",
            maxLabel: "Mucho",
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label: "¿Con qué frecuencia orás?",
            dataKey: "prayer-frequency",
            options: [
              { label: "Nunca", value: "never" },
              { label: "Muy esporádicamente", value: "very-rarely" },
              { label: "Una o varias veces al mes", value: "monthly" },
              { label: "Una o varias veces a la semana", value: "weekly" },
              { label: "Todos los días", value: "daily" },
            ],
          },
        },
        {
          componentFamily: "response",
          template: "slider",
          props: {
            label: "¿Cómo cambió esa frecuencia con la cuarentena?",
            minLabel: "Disminuyó mucho",
            maxLabel: "Aumentó mucho",
            dataKey: "prayer-change",
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label: "¿Con qué frecuencia meditás?",
            dataKey: "meditation-frequency",
            options: [
              { label: "Nunca", value: "never" },
              { label: "Muy esporádicamente", value: "very-rarely" },
              { label: "Una o varias veces al mes", value: "monthly" },
              { label: "Una o varias veces a la semana", value: "weekly" },
              { label: "Todos los días", value: "daily" },
            ],
          },
        },
        {
          componentFamily: "response",
          template: "slider",
          props: {
            label: "¿Cómo cambió esa frecuencia con la cuarentena?",
            minLabel: "Disminuyó mucho",
            maxLabel: "Aumentó mucho",
            dataKey: "meditation-change",
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label:
              "¿Recibiste previamente asistencia psicológica o psiquiátrica?",
            dataKey: "psych-assistance",
            options: [
              { label: "Sí", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label:
              "¿Estuviste internado por problemas psicológicos o psiquiátricos?",
            dataKey: "psych-hospitalization",
            options: [
              { label: "Sí", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label: "¿Tomas actualmente alguna medicación psiquiátrica?",
            dataKey: "psych-medication",
            options: [
              { label: "Sí", value: "yes" },
              { label: "No", value: "no" },
            ],
          },
        },
        {
          componentFamily: "layout",
          template: "button",
          props: { text: "Siguiente" },
        },
      ],
    },
    {
      slug: "psychodelics",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: {
            content:
              "## Marcá si consumiste alguna vez alguno de los siguientes psicodélicos",
          },
        },
        {
          componentFamily: "response",
          template: "checkboxes",
          props: {
            label: "",
            dataKey: "psychedelics",
            options: [
              { label: "Hongos", value: "mushrooms" },
              { label: "LSD", value: "lsd" },
              { label: "Ayahuasca", value: "ayahuasca" },
              { label: "DMT", value: "dmt" },
              { label: "5-MeO-DMT", value: "5meo-dmt" },
              { label: "Iboga/Ibogaina", value: "iboga" },
              { label: "San Pedro", value: "san-pedro" },
              { label: "Bufo alvarius", value: "bufo-alvarius" },
            ],
          },
        },
        {
          componentFamily: "control",
          template: "conditional",
          props: {
            component: {
              componentFamily: "layout",
              template: "button",
              props: { text: "No consumí" },
            },
            if: {
              operator: "length-lt",
              dataKey: "$psychedelics",
              value: 1,
            },
            else: {
              componentFamily: "layout",
              template: "button",
              props: { text: "Siguiente" },
            },
          },
        },
      ],
    },
    {
      slug: "psychedelics-experience",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: {
            content: "## Sobre esos psicodélicos",
          },
        },
        {
          componentFamily: "response",
          template: "numeric-input",
          props: {
            label:
              "¿Cuántas veces consumiste una dosis con efectos perceptibles (media o alta) de psicodélicos en toda tu vida? Si no lo recordás, con una respuesta aproximada alcanza.",
            dataKey: "consumption-times",
          },
        },
        {
          componentFamily: "response",
          template: "slider",
          props: {
            label:
              "¿Cómo calificarías tu experiencia promedio con los psicodélicos?",
            dataKey: "average-psychedelic-experience",
            minLabel: "Muy mala",
            maxLabel: "Muy excelente",
          },
        },
        {
          componentFamily: "response",
          template: "radio",
          props: {
            label:
              "¿Realizás o realizaste un programa sostenido de microdosificación de psicodélicos?",
            dataKey: "microdose-program",
            options: [
              { label: "Sí", value: "si" },
              { label: "No", value: "no" },
            ],
          },
        },
        {
          componentFamily: "response",
          template: "slider",
          props: {
            label:
              "Desde el comienzo de la cuarentena, tu consumo de sustancias psicodélicos:",
            minLabel: "Disminuyó mucho",
            maxLabel: "Aumentó mucho",
            dataKey: "psychedelic-consumption-change",
          },
        },
        {
          componentFamily: "control",
          template: "conditional",
          props: {
            component: {
              componentFamily: "response",
              template: "single-checkbox",
              props: {
                label:
                  "Mi consumo disminuyó por factores externos. (Ej. no tengo, me queda poco, vivo con otra genta, etc.)",
                dataKey: "consumption-change-external-factor",
                defaultValue: false,
              },
            },
            if: {
              operator: "lt",
              dataKey: "$psychedelic-consumption-change",
              value: 50,
            },
          },
        },
        {
          componentFamily: "layout",
          template: "button",
          props: { text: "Siguiente" },
        },
      ],
    },
    {
      slug: "thank-you",
      components: [
        {
          componentFamily: "content",
          template: "rich-text",
          props: { content: "## ¡Gracias por participar!" },
        },
        {
          componentFamily: "content",
          template: "rich-text",
          props: {
            content:
              "Cuando los resultados estés analizados, vas a poder verlos en [https://elgatoylacaja.com.ar/labs](https://elgatoylacaja.com.ar/labs) \n\n Ahí encontrás también otros experimentos, sus resultados y las publicaciones en las que se convirtieron.",
          },
        },
      ],
    },
  ],
};
