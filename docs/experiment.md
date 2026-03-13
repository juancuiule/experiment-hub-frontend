# Experiment

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
