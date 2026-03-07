import { ExperimentFlow } from "./types";

export type ValidationError = { code: string; message: string };

export function validateExperiment(flow: ExperimentFlow): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  const screenSlugs = new Set((flow.screens ?? []).map((s) => s.slug));

  // All edge endpoints must reference existing node ids.
  for (const edge of flow.edges) {
    // "from" may be "nodeId.branchId" for branch-condition / fork-edge
    const fromNodeId = edge.from.split(".")[0];
    if (!nodeIds.has(fromNodeId)) {
      errors.push({ code: "unknown-node", message: `Edge references unknown node "${fromNodeId}"` });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({ code: "unknown-node", message: `Edge references unknown node "${edge.to}"` });
    }
  }

  // Every screen node must have a matching screen definition.
  for (const node of flow.nodes) {
    if (node.type === "screen" && !screenSlugs.has(node.props.slug)) {
      errors.push({ code: "missing-screen", message: `Screen node "${node.id}" references slug "${node.props.slug}" which has no screen definition` });
    }
  }

  // Node ids must be unique.
  const seen = new Set<string>();
  for (const node of flow.nodes) {
    if (seen.has(node.id)) {
      errors.push({ code: "duplicate-node-id", message: `Duplicate node id "${node.id}"` });
    }
    seen.add(node.id);
  }

  // Exactly one start node must exist.
  const startNodes = flow.nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    errors.push({ code: "missing-start", message: "Flow has no start node" });
  } else if (startNodes.length > 1) {
    errors.push({ code: "multiple-start", message: "Flow has more than one start node" });
  }

  return errors;
}
