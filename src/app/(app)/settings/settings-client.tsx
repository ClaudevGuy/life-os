"use client";

import { useEffect, useState } from "react";

type Density = "compact" | "cozy" | "comfortable";
type Theme = "dark" | "light" | "system";

const KEYS = {
  theme: "lifeos.theme",
  density: "lifeos.density",
  defaultKind: "lifeos.defaultKind",
};

export function SettingsClient() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [density, setDensity] = useState<Density>("cozy");
  const [defaultKind, setDefaultKind] = useState<string>("note");

  useEffect(() => {
    setTheme((localStorage.getItem(KEYS.theme) as Theme) ?? "dark");
    setDensity((localStorage.getItem(KEYS.density) as Density) ?? "cozy");
    setDefaultKind(localStorage.getItem(KEYS.defaultKind) ?? "note");
  }, []);

  function persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <Row label="Theme" hint="Dark by default, light for daytime, system follows your OS.">
        <Pill
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
          value={theme}
          onChange={(v) => {
            const t = v as Theme;
            setTheme(t);
            persist(KEYS.theme, t);
            document.documentElement.dataset.theme = t;
          }}
        />
      </Row>
      <Row label="Density" hint="How tight the lists feel.">
        <Pill
          options={[
            { value: "compact", label: "Compact" },
            { value: "cozy", label: "Cozy" },
            { value: "comfortable", label: "Comfortable" },
          ]}
          value={density}
          onChange={(v) => {
            setDensity(v as Density);
            persist(KEYS.density, v);
            document.documentElement.dataset.density = v;
          }}
        />
      </Row>
      <Row label="Default capture kind" hint="What the floating + opens to.">
        <Pill
          options={[
            { value: "note", label: "Note" },
            { value: "task", label: "Task" },
            { value: "bookmark", label: "Bookmark" },
            { value: "idea", label: "Idea" },
          ]}
          value={defaultKind}
          onChange={(v) => {
            setDefaultKind(v);
            persist(KEYS.defaultKind, v);
          }}
        />
      </Row>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Pill({
  options,
  value,
  onChange,
  disabledValues,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  disabledValues?: string[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        const disabled = disabledValues?.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(o.value)}
            className={`text-xs px-2.5 py-1 rounded transition ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : disabled
                ? "text-[var(--text-faint)] opacity-50 cursor-not-allowed"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
