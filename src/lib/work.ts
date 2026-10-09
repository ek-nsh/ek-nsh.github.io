import { getCollection } from 'astro:content';

/** Projects in mission order. */
export async function getWork() {
  const entries = await getCollection('work');
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export type WorkItem = Awaited<ReturnType<typeof getWork>>[number];

export const missionNo = (order: number) => String(order).padStart(2, '0');

/** Deterministic fake sky coordinates for the viewfinder, so every plate has its own. */
export function skyCoords(seed: number) {
  return {
    ra: `${String(seed % 24).padStart(2, '0')}h ${String((seed * 7) % 60).padStart(2, '0')}m`,
    dec: `${seed % 2 ? '+' : '−'}${String(((seed * 3) % 70) + 5).padStart(2, '0')}° ${String((seed * 11) % 60).padStart(2, '0')}′`,
  };
}
