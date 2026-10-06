const THEME_MODE_KEY = "attendance_theme_mode";
const ACCENT_KEY = "attendance_accent";

export type ThemeMode = "light" | "dark" | "system";

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Emerald", hex: "#059669" },
  { name: "Amber", hex: "#d97706" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Slate", hex: "#475569" },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: [number, number, number], b: [number, number, number], ratio: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * ratio),
    Math.round(a[1] + (b[1] - a[1]) * ratio),
    Math.round(a[2] + (b[2] - a[2]) * ratio),
  ];
}

const WHITE: [number, number, number] = [255, 255, 255];
const BLACK: [number, number, number] = [0, 0, 0];

// Shade step -> how far to blend toward white (positive) or black (negative).
// 500 is the base accent color itself.
const SHADE_BLEND: Record<number, number> = {
  50: 0.95,
  100: 0.88,
  200: 0.72,
  300: 0.52,
  400: 0.26,
  500: 0,
  600: -0.14,
  700: -0.28,
  800: -0.42,
  900: -0.56,
  950: -0.7,
};

export function buildBrandScale(baseHex: string): Record<number, string> {
  const base = hexToRgb(baseHex);
  const scale: Record<number, string> = {};
  for (const [shade, blend] of Object.entries(SHADE_BLEND)) {
    const rgb = blend >= 0 ? mix(base, WHITE, blend) : mix(base, BLACK, -blend);
    scale[Number(shade)] = rgb.join(" ");
  }
  return scale;
}

export function applyAccentColor(hex: string) {
  const scale = buildBrandScale(hex);
  const root = document.documentElement.style;
  for (const [shade, rgbTriplet] of Object.entries(scale)) {
    root.setProperty(`--brand-${shade}`, rgbTriplet);
  }
  localStorage.setItem(ACCENT_KEY, hex);
}

export function getStoredAccent(): string {
  return localStorage.getItem(ACCENT_KEY) ?? ACCENT_PRESETS[0].hex;
}

export function getStoredThemeMode(): ThemeMode {
  return (localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null) ?? "system";
}

export function applyThemeMode(mode: ThemeMode) {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
  }
  localStorage.setItem(THEME_MODE_KEY, mode);
}

/** Call once, before paint, to avoid a flash of the default theme. */
export function initTheme() {
  applyThemeMode(getStoredThemeMode());
  applyAccentColor(getStoredAccent());
}
