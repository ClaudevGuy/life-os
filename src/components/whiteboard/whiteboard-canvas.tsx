"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { loadScene, saveScene, type LoadedScene } from "@/lib/store/whiteboard";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full grid place-items-center text-[var(--muted)]">
        Loading canvas…
      </div>
    ),
  },
);

type SaveStatus = "idle" | "saving" | "saved";

export function WhiteboardCanvas() {
  // Mirror Life-OS's own theme system (data-theme on <html> + a "lifeos:theme"
  // event); the app doesn't use next-themes.
  const [appTheme, setAppTheme] = useState<"light" | "cloudy" | "dark">("dark");
  // undefined = still loading the saved scene; null = nothing saved yet.
  const [initial, setInitial] = useState<LoadedScene | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the saved scene once, before mounting Excalidraw, so initialData is ready.
  useEffect(() => {
    let alive = true;
    loadScene()
      .then((scene) => {
        if (alive) setInitial(scene);
      })
      .catch(() => {
        if (!alive) return;
        setInitial(null);
        toast.error("Couldn't load your canvas");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const read = () => {
      const t = document.documentElement.dataset.theme;
      setAppTheme(t === "light" ? "light" : t === "cloudy" ? "cloudy" : "dark");
    };
    read();
    const onTheme = (e: Event) => {
      const m = (e as CustomEvent<{ mode?: string }>).detail?.mode;
      if (m === "light" || m === "cloudy" || m === "dark") setAppTheme(m);
    };
    window.addEventListener("lifeos:theme", onTheme);
    return () => window.removeEventListener("lifeos:theme", onTheme);
  }, []);

  const onChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveScene(elements, appState, files)
          .then(() => setStatus("saved"))
          .catch(() => {
            setStatus("idle");
            toast.error("Couldn't save canvas");
          });
      }, 600);
    },
    [],
  );

  // Flush any pending debounce on unmount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const resetView = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const els = api.getSceneElements();
    if (els.length > 0) {
      api.scrollToContent(els, { fitToContent: true });
    } else {
      api.updateScene({ appState: { scrollX: 0, scrollY: 0 } });
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    if (!window.confirm("Clear the whole canvas? This can't be undone.")) return;
    api.updateScene({ elements: [] });
    void saveScene([], api.getAppState(), {});
    toast.success("Canvas cleared");
  }, []);

  // All props handed to Excalidraw must be STABLE references. A fresh
  // object/function each render makes Excalidraw re-apply/re-render and emit
  // empty onChange events in a feedback loop that wipes the saved scene.
  const initialData = useMemo(
    () => (initial ? { ...initial, scrollToContent: false } : null),
    [initial],
  );
  const handleApi = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
  }, []);
  const renderTopRightUI = useCallback(
    () => (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={resetView}
          title="Fit everything to view"
          className="h-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-2.5 text-[12px] font-medium text-[var(--ink-2)] transition hover:border-[var(--terra)] hover:text-[var(--terra)]"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          title="Clear the whole canvas"
          className="h-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-2.5 text-[12px] font-medium text-[var(--ink-2)] transition hover:border-[var(--bad)] hover:text-[var(--bad)]"
        >
          Clear
        </button>
      </div>
    ),
    [resetView, clearCanvas],
  );

  if (initial === undefined) {
    return (
      <div className="h-full w-full grid place-items-center text-[var(--muted)]">
        Loading canvas…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Excalidraw
        excalidrawAPI={handleApi}
        initialData={initialData}
        onChange={onChange}
        theme={appTheme === "dark" ? "dark" : "light"}
        renderTopRightUI={renderTopRightUI}
      />
      <span
        className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--paper)]/80 px-2.5 py-1 text-[11px] text-[var(--muted)] backdrop-blur"
        aria-live="polite"
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Saved ✓"
            : "Autosaves locally"}
      </span>
    </div>
  );
}
