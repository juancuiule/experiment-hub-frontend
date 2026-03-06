import { create } from "zustand";
import { experiment } from "./experiment";
import { startExperiment, traverse } from "./flow";
import { FlowStep, State } from "./types";

type ExperimentStore = {
  step: FlowStep | null;
  isLoading: boolean;
  start: (startNodeId?: string) => Promise<void>;
  next: (data?: Record<string, any>) => Promise<void>;
};

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  step: null,
  isLoading: false,
  start: async (startNodeId?: string) => {
    set({ isLoading: true });
    const step = await startExperiment(experiment, startNodeId);
    set({ step, isLoading: false });
  },
  next: async (data?: Record<string, any>) => {
    const { step } = get();
    if (!step) return;
    set({ isLoading: true });
    const nextStep = await traverse(step, data);
    set({ step: nextStep, isLoading: false });
  },
}));

// Resolves the innermost active state by unwrapping in-path / in-loop wrappers.
export function getActiveState(state: State): State {
  if (state.type === "in-path") return getActiveState(state.innerState);
  if (state.type === "in-loop") return getActiveState(state.innerState);
  return state;
}
