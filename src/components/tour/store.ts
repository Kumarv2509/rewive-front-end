import { useSyncExternalStore } from 'react';

// Module-level tour state so the tour survives route changes between steps.
interface TourState {
  active: boolean;
  index: number;
}

let state: TourState = { active: false, index: 0 };
const listeners = new Set<() => void>();

function set(next: TourState) {
  state = next;
  listeners.forEach((l) => l());
}

export function startTour() {
  set({ active: true, index: 0 });
}

export function endTour() {
  set({ active: false, index: 0 });
}

export function goToStep(index: number) {
  set({ active: true, index });
}

export function useTour(): TourState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
