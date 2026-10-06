// Ported from the DOMS reference app's reportTheme.tsx -- same import
// shape (the `esm/` subpath, not the package root: Highcharts' default
// build ships highcharts-more/solid-gauge as old-style UMD bundles that
// expect a `window._Highcharts` global, which throws under Vite's ESM
// bundling; `esm/` submodules import the SAME shared instance and
// self-register as an import side-effect).
import Highcharts from "highcharts/esm/highcharts.js";
import "highcharts/esm/highcharts-more.js";
import "highcharts/esm/modules/solid-gauge.js";

/** Resolves any CSS color expression (a custom-property read, a plain
 * rgb()/hex, whatever) to its computed `rgb(r, g, b)` string -- needed
 * anywhere Highcharts.color(...) parses a color itself (gradient stops,
 * opacity fades), since that parser doesn't understand an unresolved
 * `var(--x)` the way a browser-painted SVG attribute does. Plain axis/grid
 * colors never need this -- pass the CSS-var string straight through and
 * the browser resolves it at paint time, which also means those stay live
 * across a theme/accent change with zero extra work. */
export function resolveCssColor(expr: string): string {
  const probe = document.createElement("span");
  probe.style.color = expr;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved || expr;
}

// This app's own design tokens (see index.css) -- passed as literal CSS-var
// strings wherever Highcharts just hands them to the browser untouched
// (axis lines, grid, borders), so these track the live theme/accent choice
// for free.
export const CHART_VARS = {
  brand: "rgb(var(--brand-600))",
  good: "rgb(var(--good))",
  warn: "rgb(var(--warn))",
  crit: "rgb(var(--crit))",
  hairline: "rgb(var(--hairline))",
  ink: "rgb(var(--ink))",
  inkSoft: "rgb(var(--ink-soft))",
  inkFaint: "rgb(var(--ink-faint))",
  surface: "rgb(var(--surface))",
  surfaceAlt: "rgb(var(--surface-alt))",
} as const;

let themed = false;

/** One global Highcharts theme, applied once -- every chart below just
 * inherits it (transparent background so the surrounding Card's own
 * bg-surface shows through, no default credits link, this app's own font
 * stack instead of Highcharts' generic sans-serif). Safe to call more than
 * once (e.g. from multiple chart modules); only the first call takes
 * effect. */
export function ensureHighchartsTheme() {
  if (themed) return;
  themed = true;
  Highcharts.setOptions({
    chart: {
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
      spacing: [4, 4, 4, 4],
    },
    credits: { enabled: false },
    title: { text: undefined },
  });
}

/** A top-to-bottom fading gradient for a given base color -- the vertical-
 * gradient-fill bar/area look (PowerBI/Tableau/Looker) instead of a flat
 * solid fill. `base` may be a CSS-var expression; it's resolved to a
 * concrete color first since Highcharts.color() can't parse an
 * unresolved var() itself. */
export function verticalGradient(base: string): Highcharts.GradientColorObject {
  const hex = resolveCssColor(base);
  return {
    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
    stops: [
      [0, hex],
      [1, Highcharts.color(hex).setOpacity(0.55).get("rgba") as string],
    ],
  };
}

export function horizontalGradient(base: string): Highcharts.GradientColorObject {
  const hex = resolveCssColor(base);
  return {
    linearGradient: { x1: 0, y1: 0, x2: 1, y2: 0 },
    stops: [
      [0, Highcharts.color(hex).setOpacity(0.55).get("rgba") as string],
      [1, hex],
    ],
  };
}

export const REPORT_TOOLTIP: Highcharts.TooltipOptions = {
  backgroundColor: "rgb(255 255 255 / 0.97)",
  borderColor: "#e2e8f0",
  borderRadius: 8,
  style: { fontSize: "11px", fontFamily: "inherit" },
  shadow: { color: "rgba(0,0,0,0.08)", offsetX: 0, offsetY: 1, opacity: 1, width: 3 },
};

export default Highcharts;
