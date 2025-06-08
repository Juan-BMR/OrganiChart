import { writable } from "svelte/store";

export const canvasStore = (() => {
  const { subscribe, set, update } = writable({
    scale: 1,
    x: 0,
    y: 0,
  });

  return {
    subscribe,
    setTransform: (transform) => set(transform),
    panBy: (dx, dy) => update((t) => ({ ...t, x: t.x + dx, y: t.y + dy })),
    zoomTo: (newScale, center = { x: 0, y: 0 }) =>
      update((t) => {
        // Adjust position so that zoom occurs around center point
        const scaleFactor = newScale / t.scale;
        const newX = center.x - (center.x - t.x) * scaleFactor;
        const newY = center.y - (center.y - t.y) * scaleFactor;
        return { scale: newScale, x: newX, y: newY };
      }),
    reset: () => set({ scale: 1, x: 0, y: 0 }),
  };
})();