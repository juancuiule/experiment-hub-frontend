type BaseEdge = {
  type: string; // edge type
  from: string; // node id
  to: string; // node id
};

export interface SequentialEdge extends BaseEdge {
  type: "sequential";
}

export interface BranchConditionEdge extends BaseEdge {
  type: "branch-condition";
  from: `${string}.${string}`; // BranchNode id + Branch.id (e.g. "branch1.branchA")
}

export interface BranchDefaultEdge extends BaseEdge {
  type: "branch-default";
}

export interface PathContainmentEdge extends BaseEdge {
  type: "path-contains";
  order: number; // position within the path
}

export interface LoopTemplateEdge extends BaseEdge {
  type: "loop-template";
}

export interface ForkEdge extends BaseEdge {
  type: "fork-edge";
  from: `${string}.${string}`; // ForkNode id + Fork.id (e.g. "fork1.groupA")
}

export type FrameworkEdge =
  | SequentialEdge
  | BranchConditionEdge
  | BranchDefaultEdge
  | PathContainmentEdge
  | LoopTemplateEdge
  | ForkEdge;

export function isPathEdge(edge: FrameworkEdge): edge is PathContainmentEdge {
  return edge.type === "path-contains";
}

export function isForkEdge(edge: FrameworkEdge): edge is ForkEdge {
  return edge.type === "fork-edge";
}

export function isLoopEdge(edge: FrameworkEdge): edge is LoopTemplateEdge {
  return edge.type === "loop-template";
}

export function isSequentialEdge(edge: FrameworkEdge): edge is SequentialEdge {
  return edge.type === "sequential";
}

export function isBranchEdge(
  edge: FrameworkEdge,
): edge is BranchConditionEdge | BranchDefaultEdge {
  return edge.type === "branch-condition" || edge.type === "branch-default";
}

export function isBranchConditionEdge(
  edge: FrameworkEdge,
): edge is BranchConditionEdge {
  return edge.type === "branch-condition";
}

export function isBranchDefaultEdge(
  edge: FrameworkEdge,
): edge is BranchDefaultEdge {
  return edge.type === "branch-default";
}
