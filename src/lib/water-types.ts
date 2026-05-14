// Single source of truth for water type labels (handles legacy values too)
export const WATER_TYPES = [
  { id: "normal", name: "وايت ماء عادي", desc: "للاستخدام العام والمنزلي", color: "#0284c7" },
  { id: "kawthar", name: "وايت ماء كوثر", desc: "ماء كوثر مميز", color: "#0d9488" },
] as const;

export function waterTypeLabel(value?: string | null): string {
  switch (value) {
    case "kawthar":
    case "desalinated":
      return "وايت ماء كوثر";
    case "normal":
    case "sweet":
    case "well":
    default:
      return "وايت ماء عادي";
  }
}

export function waterTypeColor(value?: string | null): string {
  return value === "kawthar" || value === "desalinated" ? "#0d9488" : "#0284c7";
}
