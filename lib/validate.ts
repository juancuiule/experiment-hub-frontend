import { FrameworkEdge } from "./edges";
import { FrameworkNode } from "./nodes";
import { ExperimentFlow } from "./types";

export type ValidationError = { code: string; message: string };

function basicChecks(flow: ExperimentFlow): ValidationError[] {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  const screenSlugs = new Set((flow.screens ?? []).map((s) => s.slug));

  // All edge endpoints must reference existing node ids.
  for (const edge of flow.edges) {
    // "from" may be "nodeId.branchId" for branch-condition / fork-edge
    const fromNodeId = edge.from.split(".")[0];
    if (!nodeIds.has(fromNodeId)) {
      errors.push({
        code: "unknown-node",
        message: `Edge references unknown node "${fromNodeId}" as source`,
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        code: "unknown-node",
        message: `Edge references unknown node "${edge.to}" as destination`,
      });
    }
  }

  // Every branch-condition edge must reference an existing branch.
  for (const edge of flow.edges) {
    if (edge.type === "branch-condition") {
      const [fromNodeId, branchId] = edge.from.split(".");
      const node = flow.nodes.find((n) => n.id === fromNodeId);
      if (node?.type !== "branch") {
        errors.push({
          code: "invalid-edge",
          message: `Branch condition edge "${edge.from}" does not reference a branch node`,
        });
      } else {
        const branch = node.props.branches.find((b) => b.id === branchId);
        if (!branch) {
          errors.push({
            code: "invalid-edge",
            message: `Branch condition edge "${edge.from}" references non-existent branch "${branchId}"`,
          });
        }
      }
    }
  }

  // Every fork-edge must reference an existing fork.
  for (const edge of flow.edges) {
    if (edge.type === "fork-edge") {
      const [fromNodeId, forkId] = edge.from.split(".");
      const node = flow.nodes.find((n) => n.id === fromNodeId);
      if (node?.type !== "fork") {
        errors.push({
          code: "invalid-edge",
          message: `Fork edge "${edge.from}" does not reference a fork node`,
        });
      } else {
        const fork = node.props.forks.find((b) => b.id === forkId);
        if (!fork) {
          errors.push({
            code: "invalid-edge",
            message: `Fork edge "${edge.from}" references non-existent fork "${forkId}"`,
          });
        }
      }
    }
  }

  // Every screen node must have a matching screen definition.
  for (const node of flow.nodes) {
    if (node.type === "screen" && !screenSlugs.has(node.props.slug)) {
      errors.push({
        code: "missing-screen",
        message: `Screen node "${node.id}" references slug "${node.props.slug}" which has no screen definition`,
      });
    }
  }

  // Node ids must be unique.
  const seen = new Set<string>();
  for (const node of flow.nodes) {
    if (seen.has(node.id)) {
      errors.push({
        code: "duplicate-node-id",
        message: `Duplicate node id "${node.id}"`,
      });
    }
    seen.add(node.id);
  }

  // One start node must exist.
  const startNodes = flow.nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    errors.push({ code: "missing-start", message: "Flow has no start node" });
  }

  const requireEdge = {
    start: "sequential",
    checkpoint: "sequential",
    path: "path-contains",
    loop: "loop-template",
    branch: "branch-condition", // or branch-default
    fork: "fork-edge",
  } as Record<FrameworkNode["type"], FrameworkEdge["type"]>;
  flow.nodes.forEach((node) => {
    const requiredEdgeType = requireEdge[node.type];
    const hasRequiredEdge = flow.edges.some((edge) => {
      return (
        edge.type === requiredEdgeType && edge.from.split(".")[0] === node.id
      );
    });
    if (!hasRequiredEdge) {
      errors.push({
        code: "missing-edge",
        message: `Node "${node.id}" of type "${node.type}" has no outgoing edge of required type "${requiredEdgeType}"`,
      });
    }
  });

  return errors;
}

// ---------------------------------------------------------------------------
// Reference availability checks
//
// Walk the flow graph forward from start, tracking the set of data paths
// that are guaranteed to be written into context.data at each point.
//
// A data path is a dot-joined string matching how the runtime nests data:
//   top-level screen "welcome"          → "welcome.name"
//   screen inside path "path-profile"   → "path-profile.demographics.age"
//
// Loop template screens are walked for @-ref validation only (insideLoop=true).
// Their data is not added to the available set because it is keyed by the
// runtime loop value which cannot be known statically.
//
// Branches are conservative: each branch target is walked in isolation
// (with a copy of the pre-branch available set). The join point is reached
// naturally via the branch targets' sequential edges. This means that if a
// screen after a branch references data written by only one of the branches,
// an error will be reported on the walk that doesn't have that data — which
// is the correct behaviour.
// ---------------------------------------------------------------------------

function buildEdgeMaps(flow: ExperimentFlow) {
  const seqNext = new Map<string, string>();
  const pathChildren = new Map<string, Array<{ to: string; order: number }>>();
  const loopTemplateTarget = new Map<string, string>();
  // Branch and fork targets indexed by node id (not "nodeId.branchId")
  const branchAllTargets = new Map<string, string[]>();
  const forkAllTargets = new Map<string, string[]>();

  for (const edge of flow.edges) {
    switch (edge.type) {
      case "sequential":
        seqNext.set(edge.from, edge.to);
        break;
      case "path-contains": {
        const arr = pathChildren.get(edge.from) ?? [];
        arr.push({ to: edge.to, order: edge.order });
        pathChildren.set(edge.from, arr);
        break;
      }
      case "loop-template":
        loopTemplateTarget.set(edge.from, edge.to);
        break;
      case "branch-condition":
      case "branch-default": {
        const nodeId = edge.from.split(".")[0];
        const arr = branchAllTargets.get(nodeId) ?? [];
        arr.push(edge.to);
        branchAllTargets.set(nodeId, arr);
        break;
      }
      case "fork-edge": {
        const nodeId = edge.from.split(".")[0];
        const arr = forkAllTargets.get(nodeId) ?? [];
        arr.push(edge.to);
        forkAllTargets.set(nodeId, arr);
        break;
      }
    }
  }

  return {
    seqNext,
    pathChildren,
    loopTemplateTarget,
    branchAllTargets,
    forkAllTargets,
  };
}

function validateReferences(flow: ExperimentFlow): ValidationError[] {
  const rawErrors: ValidationError[] = [];
  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));
  const screenMap = new Map((flow.screens ?? []).map((s) => [s.slug, s]));
  const {
    seqNext,
    pathChildren,
    loopTemplateTarget,
    branchAllTargets,
    forkAllTargets,
  } = buildEdgeMaps(flow);

  function extractTokens(text: string): string[] {
    return [...text.matchAll(/(\$\$[\w.-]+|@[\w.]+)/g)].map((m) => m[0]);
  }

  // available: set of dot-joined data paths known to exist at this point,
  //            e.g. "welcome.name", "path-profile.demographics.age"
  function checkScreenRefs(
    slug: string,
    available: Set<string>,
    insideLoop: boolean,
  ) {
    const screen = screenMap.get(slug);
    if (!screen) return;

    for (const component of screen.components) {
      const texts: string[] = [];
      const props = component.props as Record<string, unknown>;
      if (typeof props.label === "string") texts.push(props.label);
      if (typeof props.content === "string") texts.push(props.content);
      if (typeof props.text === "string") texts.push(props.text);

      for (const text of texts) {
        for (const token of extractTokens(text)) {
          if (token.startsWith("@")) {
            if (!insideLoop) {
              rawErrors.push({
                code: "invalid-reference",
                message: `Screen "${slug}" uses "${token}" but is not inside a loop`,
              });
            }
          } else {
            // Strip $$ and check whether any available path is a prefix
            const path = token.slice(2);
            const isAvailable = [...available].some(
              (a) => path === a || path.startsWith(a + "."),
            );
            if (!isAvailable) {
              rawErrors.push({
                code: "unavailable-reference",
                message: `Screen "${slug}" references "${token}" but that data is not guaranteed to be available at this point`,
              });
            }
          }
        }
      }
    }
  }

  function walk(
    nodeId: string,
    available: Set<string>,
    dataPath: string[],
    insideLoop: boolean,
  ): Set<string> {
    const node = nodeMap.get(nodeId);
    if (!node) return available;

    let current = new Set(available);

    switch (node.type) {
      case "start":
      case "checkpoint": {
        const next = seqNext.get(nodeId);
        if (next) current = walk(next, current, dataPath, insideLoop);
        break;
      }

      case "screen": {
        const { slug } = node.props;
        checkScreenRefs(slug, current, insideLoop);

        // Add this screen's written data to available for downstream nodes.
        const prefix = [...dataPath, slug].join(".");
        const screen = screenMap.get(slug);
        if (screen) {
          for (const component of screen.components) {
            if (component.componentFamily === "response") {
              current.add(`${prefix}.${component.props.dataKey}`);
            }
          }
        }

        const next = seqNext.get(nodeId);
        if (next) current = walk(next, current, dataPath, insideLoop);
        break;
      }

      case "path": {
        // Walk children in order, each one seeing the previous child's data.
        const children = (pathChildren.get(nodeId) ?? []).sort(
          (a, b) => a.order - b.order,
        );
        let childAvailable = new Set(current);
        for (const { to } of children) {
          childAvailable = walk(
            to,
            childAvailable,
            [...dataPath, nodeId],
            insideLoop,
          );
        }
        // Merge all path data back so the next node can reference it.
        childAvailable.forEach((k) => current.add(k));

        const next = seqNext.get(nodeId);
        if (next) current = walk(next, current, dataPath, insideLoop);
        break;
      }

      case "loop": {
        // Walk the template for @-reference validation only.
        // Loop screen data is keyed by the runtime value, which is unknown
        // statically, so we don't merge it back into current.
        const templateId = loopTemplateTarget.get(nodeId);
        if (templateId) walk(templateId, current, [...dataPath, nodeId], true);

        const next = seqNext.get(nodeId);
        if (next) current = walk(next, current, dataPath, insideLoop);
        break;
      }

      case "branch": {
        // Walk each branch in isolation. The join point (reached via each
        // branch target's sequential edges) will be validated separately
        // from each branch's data perspective.
        const targets = branchAllTargets.get(nodeId) ?? [];
        for (const target of targets) {
          walk(target, new Set(current), dataPath, insideLoop);
        }
        // Conservative: data after this branch node is only what was
        // available before it. Branch-specific data is NOT guaranteed.
        // (No seqNext here — branch nodes have no sequential edge out.)
        break;
      }

      case "fork": {
        const targets = forkAllTargets.get(nodeId) ?? [];
        for (const target of targets) {
          walk(target, new Set(current), dataPath, insideLoop);
        }
        break;
      }
    }

    return current;
  }

  const startNode = flow.nodes.find((n) => n.type === "start");
  if (startNode) walk(startNode.id, new Set(), [], false);

  // Deduplicate errors (some screens may be visited from multiple branch paths).
  const seen = new Set<string>();
  return rawErrors.filter((e) => {
    const key = `${e.code}:${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateExperiment(flow: ExperimentFlow): ValidationError[] {
  return [...basicChecks(flow), ...validateReferences(flow)];
}
