const g = globalThis as unknown as { __qm?: Record<string, number> };
const counters = (g.__qm ??= {});
export const count = (key: string) => { counters[key] = (counters[key] ?? 0) + 1; };
export const snapshot = () => ({ ...counters });
export const resetMetrics = () => { for (const k of Object.keys(counters)) delete counters[k]; };
