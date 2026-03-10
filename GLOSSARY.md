# Glossary

## Experiment

An experiment consists of a number of nodes and edges connected between them that define the flow of the experiment. The nodes represent the different steps or components of the experiment, while the edges represent the connections between those steps and how the participant will navigate through them.

From the user point of view the experiment consists of a series of screen nodes that are shown to the participant. Those nodes have a `slug` props that should be related to an screen in the screens list of the experiment config.

## Experiment Flow

key files: `lib/types.ts` and `lib/flow.ts`

To be able to traverse the experiment flow we need to define a starting point we have a series of functions and logic. The most important abstraction is the idea of a `FlowStep`. The flow step integrates the idea of a `State` of the experiment at a specific point in time, the `experiment` config, the `Context` and a `dataPath`.

The `State` can be one of the following:

- Initial state: this is the state of the experiment before it starts. In this state we haven't executed any node yet, and we are waiting for the participant to start the experiment.
- In node state: this is the state of the experiment when we are executing a node. In this state we are currently executing a node, and we are waiting for the participant to interact with that node (e.g. by clicking a button, filling a form, etc.).
- In path state: this is the state of the experiment when we are executing a path node. In this state we have in context the children nodes of that path, the current step and the innerState of that path (shares the same type with this).
- In loop state: this is the state of the experiment when we are executing a loop node. In this state we have in context the template node of that loop, the current iteration and the innerState of that loop (shares the same type with this). We algo have the values that we are iterating over in that loop, either from the `values` prop in the static loop, or from the `dataKey` in the dynamic loop.
- End state: this is the state of the experiment when we have executed all the nodes and we have reached the end of the experiment.

The `Context` is a partial object that contains information under different keys. These keys are:

- `start`: contains the group name in which the participant started the experiment (if there are multiple start nodes). `{ group: string }`
- `checkpoints`: contains the timestamps of the checkpoints that the participant has passed through. `{ [checkpointName: string]: number }`
- currentItem: this is an object with the format `{ value: any, index: number, loopId: string }` that's only used while inside a loop to provide information about the current iteration of the loop. The `value` key contains the value of the current iteration, the `index` key contains the index of the current iteration, and the `loopId` contains the id of the loop node.
- `branches`: contains the branches that have been taken by the participant. `{ [branchNodeId: string]: branchId }`
- `forks`: contains the forks that have been taken by the participant. `{ [forkNodeId: string]: forkId }`
- paths: contains the paths that have been taken by the participant. `{ [pathNodeId: string]: { order: string[] } }`
- loops: contains the loops that have been taken by the participant. `{ [loopNodeId: string]: { order: string[] } }`

The `dataPath` is a string that represents the path in which the data collected in the experiment will be stored. This is useful to be able to store the data in a nested structure, and to be able to access it easily later on. When we are inside a path or a loop, we will append the id of that path or loop to the dataPath, so we can have a nested structure for the data collected in that path or loop. This way the data collected in the experiment will be stored in a way that reflects the structure of the experiment flow.

## Nodes

key files: `lib/nodes.ts`

Nodes are the fundamental building blocks of an experiment flow. There are a series of node types that can be used to create a flow, and each node type has a specific function. They are connected to each other through edges, which define the flow of the experiment.

All nodes have an id:string and a type:string. The id is a unique identifier for the node, and the type is the type of node it is.

The available types of nodes are:

- `start`
- `checkpoint`
- `screen`
- `branch`
- `path`
- `fork`
- `loop`

Each of those nodes has a specific configuration or series of props.

### Start Node

The `start` node is the entry point of the experiment flow. It is the first node that is executed when the experiment is run. Most experiments will have only one start node, but it is possible to have multiple start nodes if needed to create multiple entry points for the experiment based on url parameters.

To have multiple start nodes one should use the props with `name` (to determine the name of that group) and `param` (to determine the url parameter `key` and `value` that will be used to determine which start node to use). `param` is an object with the keys `key` and `value`.

### Checkpoint Node

The `checkpoint` node is used to save the state of the experiment at a specific point in time. This can be useful to ensure that if a participant leaves the experiment we've already collected some data until that point. It has a `name` prop that is used to identify the checkpoint.

### Screen Node

The `screen` node is used to display a screen to the participant. It has a `slug` prop that is used to identify the screen to be displayed. The `slug` should correspond to a screen that has been defined in the experiment.

Each screen consists of a series of components that are rendered in a specific order. The components can be anything from text, images, videos, or interactive elements like buttons or sliders.

### Branch Node

The `branch` node is used to create a branching point in the experiment flow. It has a `name` prop that is used to identify the branch, a `description` prop that is used to provide a description of the branch, and a `branches` props that is an array of objects that define the different branches that can be taken from this point.

Each branch object has an `id` and a `name` prop that is used to identify the branch, an optional `description` prop that is used to provide a description of the branch, and a `config` prop that is used to configure under which condition the branch should be taken.

The `config` prop is an object with the `ConditionConfig` type that is used to define the condition that must be met for the branch to be taken. The `ConditionConfig` type has three properties: `operator`, `dataKey` and `value`. The `operator` property defines the comparison to apply (see ConditionConfig Operators in the Components section for the full list), the `dataKey` property is a `$$` reference to the data that will be evaluated, and the `value` property is the value that will be compared against it.

If there are multiple branch conditions that are true at the same time, the branch node will take the first one that is defined in the edges array. This means that the order of the edges in the experiment configuration can affect the flow of the experiment.

Branch reconvergence is not required, many branches can lead to different or same nodes but it is not the responsibility of the branch to check that. The connected nodes will determine the flow after the branch node, not the branch node itself.

### Path Node

The `path` node is used to create a path in the experiment flow. It has a `name` prop that is used to identify the path, a `description` prop that is used to provide a description of the path, a `randomized` prop that is used to determine if the path should be randomized or not, and a `stepper` props that allows to configure and optional stepper to be shown at the top of the screen to indicate the progress of the participant in that path.

The only required props is the `name` prop. The stepper configuration is an object with the `StepperConfig` type that has two properties: `label?` and `style`. The `label` property is a string that defines the label to be shown in the stepper, and the `style` property is a string that defines the style of the stepper (e.g. `continuous` or `dashed`). In the label prop `{index}` will be replaced by the current step index, and `{total}` will be replaced by the total number of steps in that path.

### Fork Node

The `fork` node is used to create a fork in the experiment flow. It has a `name` prop that is used to identify the fork, a `description` prop that is used to provide a description of the fork, and a `forks` props that is an array of objects that define the different paths that can be taken from this point. Each fork object is of type `Fork`.

The `Fork` type has an `id` and a `name` prop that is used to identify the fork, an optional `description` prop that is used to provide a description of the fork, and a `weight` prop that is used to determine the probability of that fork being taken. To determine the fork to be taken we should sum the weights of all the forks and then generate a random number based on that distribution.

Fork nodes should not have sequential edges connecting them to other nodes, since the flow after a fork node is determined by the nodes connected fork edges.

### Loop Node

The `loop` node is used to create a loop in the experiment flow. It can be one of two types: `static` or `dynamic`.

The `static` loop node has a `values` prop (string[]) that is used to define the different values that will be iterated over in the loop.

The `dynamic` loop node has a `dataKey` prop that is used to define the key of the data that will be used to determine the different values that will be iterated over in the loop.

Both types of loop have a `stepper?` prop that allows to configure an optional stepper to be shown at the top of the screen to indicate the progress of the participant in that loop. This stepper is exactly the same as the one used in the `path` node, with the same `StepperConfig` type.

## Edges

key files: `lib/edges.ts`

As said before nodes are connected to each other through edges, which define the flow of the experiment. Each edge has a `type`, a `from` prop that is used to define the id of the node that is the source of the edge, and a `to` prop that is used to define the id of the node that is the target of the edge.

There are different types of edges that can be used to connect the nodes, and each type of edge has a specific function. The available types of edges are:

- `sequential`
- `branch-condition` and `branch-default`
- `path-contains`
- `loop-template`
- `fork-edge`

The `sequential` edge is used to connect two nodes in a sequential manner, meaning that the target node will be executed after the source node is executed.

The `branch-condition` edge is used to connect a branch node to the different branches that can be taken from that point. The `branch-default` edge is used to connect a branch node to the default branch that will be taken if none of the conditions for the other branches are met. The `from` prop of the `branch-condition` edge has to satisfy the `branchNodeId.branchId` format, where `branchNodeId` is the id of the branch node, and `branchId` is the id of the branch that is being connected. The source of this edge has to be a branch node.

The `path-contains` edge is used to connect a path node to the different nodes that are contained in that path. This edge has an extra prop called `order` that is used to define the order of the nodes in the path. If the path is randomized this order will be ignored. The source node of this edge has to be a path node. The order of the nodes in a path is determined by the order of the edges in the experiment configuration. If the path is randomized, this order will be ignored and the nodes will be randomized instead. It's a 0 index based order, so the first node in the path should have an edge with order 0, the second node should have an edge with order 1, and so on.

The `loop-template` edge is used to connect a loop node to the node that serves as a template for the different iterations of the loop. The source node of this edge has to be a loop node.

The `fork-edge` is used to connect a fork node to the different paths that can be taken from that point. The `from` prop of the `fork-edge` has to satisfy the `forkNodeId.forkId` format, where `forkNodeId` is the id of the fork node, and `forkId` is the id of the fork that is being connected. The source of this edge has to be a fork node.

## Nodes - Edges Validation

There are some rules or validations that can ensure that the experiment is well formed and that it can be executed without errors. These rules are:

- Every edge should connect two existing nodes. This means that the `from` and `to` props of each edge should correspond to the id of an existing node (or branch/fork sub id).
- There should be at least one start node.
- All the start nodes should be connected to at least one other node through a sequential edge.
- Every branch node should have at least one branch-condition edge connecting it to a branch, and one branch-default edge connecting it to the default branch.
- Every fork node should have at least two fork-edge connecting it to different nodes.
- Every path node should have at least one path-contains edge connecting it to a node that is contained in that path.
- Every path node should have exactly one sequential edge connecting it to the next node in the flow after the path.
- Every loop node should have only one loop-template edge connecting it to a node that serves as a template for the different iterations of the loop.
- Every screen node should have a slug prop that corresponds to a screen that has been defined in the experiment.
- Every dataKey value used in the condition config of a branch node should correspond to a data key that is being collected in the experiment previously.
- Every dataKey value used in the dynamic loop node should correspond to a data key that is being collected in the experiment previously.
- The loop node should have a sequential edge connecting it to the next node in the flow after the loop.

## Data Keys and special characters

In order to reference values collected in the experiment context we will use a `$$path.to.dataKey` notation. This means that if we have a data key called `age` that is being collected in the experiment, we can reference it in the condition config of a branch node as `$$age`. It supports the dot notation to reference nested data, so if we have a data key called `demographics` that is an object with an `age` property, we can reference it as `$$demographics.age`.

In order to reference values from the current loop we use the `@` notation to access to data inside the `currentItem` object in the context. So if we want to access the value of the current iteration we can use `@value`, if we want to access the index of the current iteration we can use `@index`, and if we want to access the loopId of the current loop we can use `@loopId`.

We will also be using `$` (a single dollar sign) to reference values from the current screen. This is usefull to be able to use values from the current screen to show or hide another component in the same screen based on the interaction of the participant with the first component. For example if we ask a participant if they have children (with a yes/no boolean component) whe may use that `$hasChildren` value to show a new component asking how many children do they have only if the answer to the first question is yes.

## Components

key files: `lib/components/index.ts`, `lib/components/content.ts`, `lib/components/response.ts`, `lib/components/layout.ts`, `lib/components/control.ts`

Components are the building blocks of screens. Each screen contains an ordered list of `ScreenComponent`s that are rendered in sequence to the participant.

All components share a base structure:

- `id?`: optional string identifier for the component
- `componentFamily`: the family the component belongs to (`content`, `response`, `layout`, or `control`)
- `template`: the specific component type within its family

There are four component families: `content`, `response`, `layout`, and `control`.

### Content Components

Content components display information to the participant. They have no data collection and produce no output.

#### `rich-text`

- `content: string` — HTML/markdown content to render

#### `image`

- `url: string` — URL of the image
- `alt: string` — alternative text for the image

#### `video`

- `url: string` — URL of the video
- `autoplay?: boolean` — whether the video should autoplay on render
- `muted?: boolean` — whether the video should be muted
- `loop?: boolean` — whether the video should loop when it ends
- `controls?: boolean` — whether to show playback controls to the participant

#### `audio`

- `url: string` — URL of the audio file
- `autoplay?: boolean` — whether the audio should autoplay on render
- `loop?: boolean` — whether the audio should loop when it ends
- `controls?: boolean` — whether to show playback controls to the participant

### Response Components

Response components collect data from the participant. All response components share these base props in addition to their own:

- `dataKey: string` — the key under which the collected value will be stored
- `required?: boolean` — whether the field must be filled before advancing
- `errorMessage?: string` — fallback error message shown when `required` is not met. Individual validation rules (e.g. `minLength`, `pattern`) each carry their own `errorMessage` and take precedence over this one.

#### `slider`

Collects a numeric value within a range.

- `label: string`
- `min?: number`
- `max?: number`
- `step?: number`
- `defaultValue?: number`
- `minLabel?: string` — label shown at the minimum end
- `maxLabel?: string` — label shown at the maximum end
- `showValue?: boolean` — whether to display the current numeric value to the participant as they drag

Validation (each with its own `errorMessage`):
- `requiresInteraction?: { errorMessage?: string }` — the participant must actively move the slider before advancing, even if a `defaultValue` is set
- `minValue?: { value: number; errorMessage?: string }` — the selected value must be at or above this threshold
- `maxValue?: { value: number; errorMessage?: string }` — the selected value must be at or below this threshold

Collected value: `number`

#### `single-checkbox`

Collects a boolean value from a single checkbox.

- `label: string`
- `defaultValue: boolean`
- `shouldBe?: boolean` — if set, validation will require the value to match this boolean (useful for consent checkboxes)

Collected value: `boolean`

#### `text-input`

Collects a single line of free-form text.

- `label: string`
- `placeholder?: string`

Validation (each with its own `errorMessage`):
- `minLength?: { value: number; errorMessage?: string }`
- `maxLength?: { value: number; errorMessage?: string }`
- `pattern?: { value: string; errorMessage?: string }` — a regex pattern the input must match

Collected value: `string`

#### `text-area`

Collects a multi-line free-form text response. Use instead of `text-input` when longer answers are expected.

- `label: string`
- `placeholder?: string`
- `lines?: number` — the number of visible lines (controls the initial height of the textarea)

Validation (each with its own `errorMessage`):
- `minLength?: { value: number; errorMessage?: string }`
- `maxLength?: { value: number; errorMessage?: string }` — when set, a character counter is shown to the participant
- `pattern?: { value: string; errorMessage?: string }` — a regex pattern the input must match

Collected value: `string`

#### `date-input`

Collects a date.

- `label: string`

Collected value: `string`

#### `time-input`

Collects a time.

- `label: string`

Collected value: `string`

#### `dropdown`

Collects a single selection from a dropdown list.

- `label: string`
- `options: Option[]` — array of `{ label: string; value: string }` objects
- `randomize?: boolean` — if true, the order of options is shuffled for each participant. The presented order is saved alongside the collected value.

Collected value: `string` (the `value` of the selected option)

#### `radio`

Collects a single selection displayed as a radio button list.

- `label: string`
- `options: Option[]` — array of `{ label: string; value: string }` objects
- `randomize?: boolean` — if true, the order of options is shuffled for each participant. The presented order is saved alongside the collected value.

Collected value: `string` (the `value` of the selected option)

#### `checkboxes`

Collects one or more selections from a list of checkboxes.

- `label: string`
- `options: Option[]` — array of `{ label: string; value: string }` objects
- `min?: number` — minimum number of options that must be selected
- `max?: number` — maximum number of options that can be selected
- `randomize?: boolean` — if true, the order of options is shuffled for each participant. The presented order is saved alongside the collected value.

Collected value: `string[]` (array of selected option `value`s)

#### `numeric-input`

Collects a numeric value via a typed input field. Unlike `slider`, this does not constrain the interaction to a drag gesture and is better suited when the participant needs to enter a precise value.

- `label: string`
- `placeholder?: string`
- `min?: number` — minimum allowed value
- `max?: number` — maximum allowed value
- `step?: number` — increment step for browser controls
- `defaultValue?: number`

Collected value: `number`

#### `likert-scale`

Collects a response on a symmetric agree/disagree or frequency scale. Replaces the `rating` component with a more flexible and semantically accurate structure for psychometric measurements.

- `label: string` — the question or statement being rated
- `options: LikertOption[]` — ordered array of scale points, each as `{ label: string; value: string }`. The researcher defines all points explicitly, allowing asymmetric, custom-labeled, or numeric scales of any length.

The `options` array determines the scale length and labels entirely. A 5-point Likert scale would have 5 items, a 7-point would have 7, etc. There is no enforced symmetry — the researcher is responsible for defining a meaningful scale.

Collected value: `string` (the `value` of the selected option)

### Layout Components

Layout components control the structure and navigation of a screen.

#### `button`

Advances the screen when clicked.

- `text?: string` — button label
- `disabled?: boolean`
- `alignBottom?: boolean` — pins the button to the bottom of the screen

#### `group`

Groups a set of components together under a named container. Useful for organizing related components visually or logically.

- `name: string` — identifier for the group
- `components: ScreenComponent[]` — the nested components to render

### Control Components

Control components add conditional rendering and iteration logic within a single screen. Unlike the `loop` node (which operates at the flow/navigation level), control components operate purely at the render level inside a screen.

#### `conditional`

Renders a single component only when a condition is met. Uses `ConditionConfig` (see below) to define the condition.

- `operator: Operator` — the comparison operator (see ConditionConfig Operators)
- `dataKey` — a `$$`, `@` or `$` reference to the value to evaluate (see Data Keys)
- `value: string | number | boolean` — the value to compare against
- `component: ScreenComponent` — the component to render if the condition is true

#### `for-each`

Renders a component template once per item in a list. Mirrors the `loop` node but operates within a single screen render rather than across flow steps.

- `type: "static" | "dynamic"`
- For `static`: `values: string[]` — explicit list of values to iterate over
- For `dynamic`: `dataKey` — a `$$` or `$` reference to a collected array to iterate over
- `component: ScreenComponent` — the template component rendered for each item

### ConditionConfig Operators

The `ConditionConfig` type is used by both the `branch` node and the `conditional` component. The available operators are:

**Base operators** (compare scalar values):

| Operator | Meaning               |
| -------- | --------------------- |
| `eq`     | equal                 |
| `neq`    | not equal             |
| `lt`     | less than             |
| `lte`    | less than or equal    |
| `gt`     | greater than          |
| `gte`    | greater than or equal |

**Array operators** (work on arrays or strings):

| Operator     | Meaning                                  |
| ------------ | ---------------------------------------- |
| `contains`   | the array includes the given value       |
| `length-eq`  | length equals value                      |
| `length-neq` | length does not equal value              |
| `length-lt`  | length is less than value                |
| `length-lte` | length is less than or equal to value    |
| `length-gt`  | length is greater than value             |
| `length-gte` | length is greater than or equal to value |

For `length-*` operators, if the target is a string, its character length is used. If undefined, the condition evaluates to `false`.
