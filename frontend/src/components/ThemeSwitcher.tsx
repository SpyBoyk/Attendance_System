import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  ACCENT_PRESETS,
  applyAccentColor,
  applyThemeMode,
  getStoredAccent,
  getStoredThemeMode,
  type ThemeMode,
} from "@/lib/theme";

const MODES: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

export function ThemeSwitcher({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [accent, setAccent] = useState<string>(() => getStoredAccent());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectMode(next: ThemeMode) {
    setMode(next);
    applyThemeMode(next);
  }

  function selectAccent(hex: string) {
    setAccent(hex);
    applyAccentColor(hex);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Theme settings"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex size-9 items-center justify-center rounded-md",
          dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-muted hover:bg-brand-50 hover:text-brand-700",
        )}
      >
        <Palette className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-lg border border-hairline bg-surface p-3 text-left shadow-lg">
          <p className="mb-2 text-xs font-medium text-ink-muted">Appearance</p>
          <div className="mb-3 flex gap-1">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-hairline px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-brand-50",
                  mode === key && "border-brand-600 bg-brand-50 text-brand-700",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-medium text-ink-muted">Accent color</p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                aria-label={preset.name}
                onClick={() => selectAccent(preset.hex)}
                className="flex size-8 items-center justify-center rounded-full border border-hairline"
                style={{ backgroundColor: preset.hex }}
              >
                {accent === preset.hex && <Check className="size-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
