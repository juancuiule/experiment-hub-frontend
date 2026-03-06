import { create } from "zustand";
import { experiment } from "./experiment";
import { startExperiment, traverse } from "./flow";
import { FlowStep } from "./types";

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
    try {
      const step = await startExperiment(experiment, startNodeId);
      set({ step, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
  next: async (data?: Record<string, any>) => {
    const { step } = get();
    if (!step) return;
    set({ isLoading: true });
    try {
      const nextStep = await traverse(step, data);
      set({ step: nextStep, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },
}));
