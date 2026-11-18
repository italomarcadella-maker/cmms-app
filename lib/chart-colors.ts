/**
 * Chart colours. Recharts needs literal values, so the FITT palette is repeated here:
 * keep it in sync with app/brand-palette.css (azure/green/fuchsia 500 are the brand colours).
 */
export const chartColors = {
    primary: "#0098DB", // Azzurro FITT
    success: "#95C11F", // Verde FITT
    critical: "#E6007E", // Fucsia FITT
    warning: "#F59E0B", // functional exception: warning / delayed
    neutral: "#A2A4A3",
    grid: "#E1E2E3",
    axis: "#6C6F70",
} as const

/** Ordered series for charts with several categories: brand colours first, then supporting tones. */
export const chartSeries = ["#0098DB", "#95C11F", "#E6007E", "#6C6F70", "#F59E0B", "#66C1E9", "#779A19", "#F066B1"] as const

/** Work-order category colours, the same in every chart. */
export const categoryColors: Record<string, string> = {
    MECHANICAL: "#0098DB",
    ELECTRICAL: "#F59E0B",
    HYDRAULIC: "#E6007E",
    PNEUMATIC: "#66C1E9",
    PLANT: "#95C11F",
    SAFETY: "#B80065",
    IMPROVEMENT: "#779A19",
    OTHER: "#A2A4A3",
}

export const categoryColor = (category: string) => categoryColors[category] ?? categoryColors.OTHER
