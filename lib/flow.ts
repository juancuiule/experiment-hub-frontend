import { evaluateCondition, getValue } from "./conditions";
import {
  isBranchConditionEdge,
  isBranchDefaultEdge,
  isForkEdge,
  isLoopEdge,
  isPathEdge,
  isSequentialEdge,
} from "./edges";
import { BranchNode, Fork, ForkNode, FrameworkNode } from "./nodes";
import {
  Context,
  ExperimentFlow,
  FlowStep,
  InLoopState,
  InNodeState,
  InPathState,
  State,
} from "./types";
import { isDefined, send, shuffle } from "./utils";

// This function determines if we should auto-traverse from
// the current step without waiting for external input.
function shouldAutoTraverse(step: FlowStep): boolean {
  const { state } = step;

  const isAutoNode =
    state.type === "in-node" &&
    ["start", "checkpoint", "branch", "fork"].includes(state.node.type);

  return isAutoNode;
}

// This function computes the initial state when entering a node.
// When we enter a path or a loop, we need to setup the inner state.
function initialState(
  experiment: ExperimentFlow,
  context: Context,
  node: FrameworkNode,
): State {
  switch (node.type) {
    case "start":
    case "checkpoint":
    case "screen":
    case "branch":
    case "fork": {
      return { type: "in-node" as const, node };
    }
    case "loop": {
      const template = getTemplateNode(experiment, node.id);

      if (!template) {
        throw new Error("Loop node must have a template node");
      }

      const values =
        node.props.type === "static"
          ? node.props.values
          : (getValue(context, node.props.dataKey) ?? []);

      return {
        type: "in-loop" as const,
        node,
        values,
        template,
        index: 0,
        innerState: initialState(experiment, context, template),
      };
    }
    case "path": {
      const childs = getChildNodes(experiment, node.id);

      if (!childs || childs.length === 0) {
        throw new Error("Path node must have child nodes");
      }

      const childsInOrder = node.props.randomized ? shuffle(childs) : childs;

      return {
        type: "in-path" as const,
        node,
        childs: childsInOrder,
        step: 0,
        innerState: initialState(experiment, context, childsInOrder[0]),
      };
    }
  }
}

// This function handles entering a step, applying any auto-traversal logic if needed.
async function enterStep(step: FlowStep): Promise<FlowStep> {
  if (step.state.type === "in-loop") {
    // Inject __currentItem into context.data so screens inside the loop can reference it
    const { values, index, node } = step.state;
    const contextWithItem = mergeContext(step.context, {
      data: { __currentItem: { value: values[index], index, loopId: node.id } },
      loops: {
        [node.id]: { order: values },
      },
    });
    return { ...step, context: contextWithItem };
  }
  if (step.state.type === "in-path") {
    const { node, childs } = step.state;
    return {
      ...step,
      context: mergeContext(step.context, {
        paths: {
          [node.id]: { order: childs.map((child) => child.id) },
        },
      }),
    };
  }
  return shouldAutoTraverse(step) ? await traverse(step) : step;
}

export async function traverse(
  step: FlowStep,
  data?: Record<string, any>,
): Promise<FlowStep> {
  const { state, experiment, context } = step;

  switch (state.type) {
    case "end": {
      return step; // no-op, already at the end
    }
    case "initial": {
      const startNodeId = data?.startNodeId as string | undefined;
      const startNode = startNodeId
        ? getNode(experiment, startNodeId)
        : experiment.nodes.find((n) => n.type === "start");

      if (!startNode || startNode.type !== "start") {
        throw new Error(
          startNodeId
            ? `Start node not found: ${startNodeId}`
            : "No start node found in experiment",
        );
      }

      return await enterStep({
        state: initialState(experiment, context, startNode),
        experiment,
        context,
      });
    }
    case "in-node": {
      return await traverseInNode({ ...step, state }, data ?? {});
    }
    case "in-path": {
      return await traverseInPath({ ...step, state }, data ?? {});
    }
    case "in-loop": {
      return await traverseInLoop({ ...step, state }, data ?? {});
    }
  }
}

function getNextSequentialNode(experiment: ExperimentFlow, fromNodeId: string) {
  const edge = experiment.edges
    .filter(isSequentialEdge)
    .find((e) => e.from === fromNodeId);
  if (!edge) return null;
  return getNode(experiment, edge.to);
}

function getTemplateNode(experiment: ExperimentFlow, nodeId: string) {
  const edge = experiment.edges
    .filter(isLoopEdge)
    .find((e) => e.from === nodeId);
  if (!edge) return null;
  return getNode(experiment, edge.to);
}

function getChildNodes(experiment: ExperimentFlow, nodeId: string) {
  const edges = experiment.edges
    .filter(isPathEdge)
    .filter((e) => e.from === nodeId)
    .sort((a, b) => a.order - b.order);
  if (edges.length === 0) return null;
  return edges
    .map((e) => getNode(experiment, e.to))
    .filter((n) => isDefined<FrameworkNode>(n));
}

function getBranchNode(
  experiment: ExperimentFlow,
  nodeId: string,
  winnerId: string,
) {
  const fromId = `${nodeId}.${winnerId}`;
  const edge = experiment.edges
    .filter(isBranchConditionEdge)
    .find((e) => e.from === fromId);
  if (!edge) return null;
  return getNode(experiment, edge.to);
}

function getDefaultBranchNode(experiment: ExperimentFlow, nodeId: string) {
  const edge = experiment.edges
    .filter(isBranchDefaultEdge)
    .find((e) => e.from === nodeId);
  if (!edge) return null;
  return getNode(experiment, edge.to);
}

function getForkEdgeNode(
  experiment: ExperimentFlow,
  nodeId: string,
  winnerId: string,
) {
  const fromId = `${nodeId}.${winnerId}`;
  const edge = experiment.edges
    .filter(isForkEdge)
    .find((e) => e.from === fromId);
  if (!edge) return null;
  return getNode(experiment, edge.to);
}

function getNode(experiment: ExperimentFlow, nodeId: string) {
  return experiment.nodes.find((n) => n.id === nodeId);
}

/*
context: {
  branches: { "age-branch": "under-30" },
  ...
}

toMerge: {
  branches: { "gender-branch": "male" },
}

result: {
  branches: {
    "age-branch": "under-30",
    "gender-branch": "male"
  },
  ...
  }
}
*/
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      result[key] = deepMerge(target[key] ?? {}, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

function mergeContext(context: Context, toMerge: Context): Context {
  return deepMerge(context, toMerge);
}

function selectForkByWeight(forks: Fork[]): Fork {
  const total = forks.reduce((sum, f) => sum + (f.weight ?? 1), 0);
  let rand = Math.random() * total;
  for (const fork of forks) {
    rand -= fork.weight ?? 1;
    if (rand <= 0) return fork;
  }
  return forks[forks.length - 1];
}

// Curried helper for .then()-based chaining:
export function next(data?: Record<string, any>) {
  return (step: FlowStep) => traverse(step, data);
}

export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
): Promise<FlowStep> {
  return await traverse(
    { state: { type: "initial" }, experiment, context: {} },
    startNodeId ? { startNodeId } : undefined,
  );
}

export async function traverseInNode(
  step: FlowStep<InNodeState>,
  data: Record<string, any>,
): Promise<FlowStep> {
  const { state, experiment, context } = step;
  switch (state.node.type) {
    case "start": {
      const nNode = getNextSequentialNode(experiment, state.node.id);
      if (!nNode) {
        throw new Error("Start node must have a next node");
      }

      const nState = initialState(experiment, context, nNode);
      const nContext = mergeContext(context, {
        start: {
          group: state.node.props
            ? `${state.node.props.param.key}=${state.node.props.param.value}`
            : "default",
        },
      });

      return await enterStep({ state: nState, experiment, context: nContext });
    }
    case "checkpoint": {
      await send(context); // retried on failure in a real implementation
      const nNode = getNextSequentialNode(experiment, state.node.id);

      const nContext = mergeContext(context, {
        checkpoints: {
          [state.node.props.name]: new Date().toISOString(),
        },
      });

      if (!nNode) return { ...step, context: nContext, state: { type: "end" } };

      const nState = initialState(experiment, nContext, nNode);
      return await enterStep({ state: nState, experiment, context: nContext });
    }
    case "branch": {
      const { nNode, winnerId } = getWinnerNode(
        experiment,
        state.node,
        context,
      );

      if (!nNode) {
        throw new Error(
          "Branch node must have a next node for the winning branch",
        );
      }

      return await enterStep({
        experiment,
        state: initialState(experiment, context, nNode),
        context: mergeContext(context, {
          branches: {
            [state.node.id]: winnerId,
          },
        }),
      });
    }
    case "fork": {
      const { nNode, winnerId } = await getWinnerFork(experiment, state.node);

      if (!nNode) {
        throw new Error("Fork node must have a next node for the winning fork");
      }

      return await enterStep({
        experiment,
        state: initialState(experiment, context, nNode),
        context: mergeContext(context, {
          forks: {
            [state.node.id]: winnerId,
          },
        }),
      });
    }
    case "screen": {
      const nContext = mergeContext(context, {
        data: { [state.node.props.slug]: data },
      });
      const nNode = getNextSequentialNode(experiment, state.node.id);
      if (!nNode) return { ...step, context: nContext, state: { type: "end" } };

      const nState = initialState(experiment, nContext, nNode);
      return await enterStep({ state: nState, experiment, context: nContext });
    }
  }
}

export async function traverseInPath(
  step: FlowStep<InPathState>,
  data: Record<string, any>,
): Promise<FlowStep> {
  const { state, experiment, context } = step;

  // when we receive a "next" action being in a path
  // we traverse the inner state
  const { state: nInnerState, context: nContext } = await traverse(
    { state: state.innerState, experiment, context },
    data,
  );

  // If  the inner state returns "end" it means we completed the current
  // child node and should move to the next one in the path
  if (nInnerState.type === "end") {
    // When the completed child is a screen, move its flat data entry
    // into a namespace keyed by the path id: data[pathId][screenSlug].
    const completedChild = state.childs[state.step];
    let contextAfterChild = nContext;
    if (completedChild.type === "screen") {
      const screenSlug = completedChild.props.slug;
      const pathId = state.node.id;
      const { [screenSlug]: screenData, ...restData } = nContext.data ?? {};
      contextAfterChild = mergeContext(
        { ...nContext, data: restData },
        { data: { [pathId]: { [screenSlug]: screenData } } },
      );
    }

    const nextStep = state.step + 1;
    if (nextStep < state.childs.length) {
      const nextNode = state.childs[nextStep];
      return {
        experiment,
        state: {
          ...state,
          step: nextStep,
          innerState: initialState(experiment, contextAfterChild, nextNode),
        },
        context: contextAfterChild,
      };
    }

    const nNode = getNextSequentialNode(experiment, state.node.id);
    if (!nNode) {
      // return end state if this path is the end of the experiment
      return {
        experiment,
        state: { type: "end" },
        context: contextAfterChild,
      };
    }

    const nState = initialState(experiment, contextAfterChild, nNode);
    return await enterStep({
      state: nState,
      experiment,
      context: contextAfterChild,
    });
  }

  return {
    experiment,
    state: { ...state, innerState: nInnerState },
    context: nContext,
  };
}

export async function traverseInLoop(
  step: FlowStep<InLoopState>,
  data: Record<string, any>,
): Promise<FlowStep> {
  const { state, experiment, context } = step;

  // __currentItem is already in context, injected by autoTraverse on entry
  // and updated here whenever advancing to the next iteration
  const { state: nInnerState, context: nContext } = await traverse(
    { state: state.innerState, experiment, context },
    data,
  );

  // Same signal mechanism as in-path: end inner → advance iteration.
  if (nInnerState.type === "end") {
    // When the template is a screen, namespace its data under the loop id.
    let contextAfterChild = nContext;
    if (state.template.type === "screen") {
      const screenSlug = state.template.props.slug;
      const loopId = state.node.id;
      const { [screenSlug]: screenData, ...restData } = nContext.data ?? {};
      contextAfterChild = mergeContext(
        { ...nContext, data: restData },
        { data: { [loopId]: { [screenSlug]: screenData } } },
      );
    }

    const nextIteration = state.index + 1;
    if (nextIteration < state.values.length) {
      const contextWithNextItem = mergeContext(contextAfterChild, {
        data: {
          __currentItem: {
            value: state.values[nextIteration],
            index: nextIteration,
            loopId: state.node.id,
          },
        },
      });
      return {
        experiment,
        state: {
          ...state,
          index: nextIteration,
          innerState: initialState(
            experiment,
            contextWithNextItem,
            state.template,
          ),
        },
        context: contextWithNextItem,
      };
    }

    const nNode = getNextSequentialNode(experiment, state.node.id);
    if (!nNode) {
      // return end state if this loop is the end of the experiment
      return {
        experiment,
        state: { type: "end" },
        context: contextAfterChild,
      };
    }

    // Strip __currentItem from data when exiting the loop
    const { __currentItem, ...dataWithoutItem } = contextAfterChild.data ?? {};
    const contextAfterLoop: Context = {
      ...contextAfterChild,
      data: dataWithoutItem,
    };
    const nState = initialState(experiment, contextAfterLoop, nNode);
    return await enterStep({
      state: nState,
      experiment,
      context: contextAfterLoop,
    });
  }

  return {
    experiment,
    state: { ...state, innerState: nInnerState },
    context: nContext,
  };
}

function getWinnerNode(
  experiment: ExperimentFlow,
  branchNode: BranchNode,
  context: Context,
) {
  const branches = branchNode.props.branches;
  const winner = branches.find((b) => evaluateCondition(b.config, context));

  const nNode = winner
    ? getBranchNode(experiment, branchNode.id, winner.id)
    : getDefaultBranchNode(experiment, branchNode.id);

  return { nNode, winnerId: winner?.id ?? "default" };
}

async function getWinnerFork(experiment: ExperimentFlow, forkNode: ForkNode) {
  const forks = forkNode.props.forks;
  const winner = selectForkByWeight(forks);

  const nNode = getForkEdgeNode(experiment, forkNode.id, winner.id);

  return { nNode, winnerId: winner.id };
}
