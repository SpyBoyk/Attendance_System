// Shared chart constants -- read the app's own CSS custom properties so
// chart color always matches the current theme and the user's chosen
// accent color (see lib/theme.ts), instead of a hardcoded hex.
export const CHART_LINE = "rgb(var(--brand-600))";
export const CHART_GRID = "rgb(var(--hairline))";
export const CHART_AXIS = "rgb(var(--ink-faint))";

// A small sequential palette for multi-series/category charts (donuts,
// grouped bars) -- brand first, then supporting hues, all pulled from the
// app's own CSS vars so they track the current theme/accent choice.
export const CHART_PALETTE = [
  "rgb(var(--brand-600))",
  "rgb(var(--good))",
  "rgb(var(--warn))",
  "rgb(var(--crit))",
  "rgb(var(--brand-300))",
];

export const CHART_LABEL = {
  fontSize: 10,
  fontWeight: 700,
  fill: "rgb(var(--ink-soft))",
};
