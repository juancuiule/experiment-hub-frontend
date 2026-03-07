import { ConditionConfig } from "./conditions";

interface BaseNode {
  id: string;
  type: string;
}

export interface StartNode extends BaseNode {
  type: "start";
  props?: {
    name: string;
    param: { key: string; value: string };
  };
}

export interface CheckpointNode extends BaseNode {
  type: "checkpoint";
  props: {
    name: string;
  };
}

export interface ScreenNode extends BaseNode {
  type: "screen";
  props: {
    slug: string;
  };
}

export type Branch = {
  id: string;
  name: string;
  description?: string;
  config: ConditionConfig;
};

export interface BranchNode extends BaseNode {
  type: "branch";
  props: {
    name: string;
    description?: string;
    branches: Branch[];
  };
}

export type StepperConfig = { label?: string; style?: "continuous" | "dashed" };

export interface PathNode extends BaseNode {
  type: "path";
  props: {
    name: string;
    description?: string;
    randomized?: boolean;
    stepper?: StepperConfig;
  };
}

export type Fork = {
  id: string;
  name: string;
  description?: string;
  weight?: number;
};

export interface ForkNode extends BaseNode {
  type: "fork";
  props: {
    forks: Fork[];
  };
}

export interface LoopNode extends BaseNode {
  type: "loop";
  props: (
    | { type: "static"; values: string[] }
    | { type: "dynamic"; dataKey: `$$${string}` }
  ) & { stepper?: StepperConfig };
}

export type FrameworkNode =
  | StartNode
  | CheckpointNode
  | ScreenNode
  | BranchNode
  | PathNode
  | ForkNode
  | LoopNode;