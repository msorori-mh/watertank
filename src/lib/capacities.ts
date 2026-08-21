// السعات المتاحة للوايت (لتر) — مصدر واحد للإدارة والسائق والعميل
export const TANK_CAPACITIES = [1000, 2000, 3000, 5000, 6000, 10000] as const;

export const formatCapacity = (c: number) => `${c.toLocaleString("ar-EG")} لتر`;
