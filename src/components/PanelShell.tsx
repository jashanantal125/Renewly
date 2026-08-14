"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

/** Must match the exit keyframes in globals.css. */
const CLOSE_ANIMATION_MS = 160;

/**
 * Overlay shell shared by the calendar and notification panels: backdrop,
 * enter/exit animation, Escape handling, and a `close` callback that waits
 * for the exit animation before unmounting.
 */
export function PanelShell({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, CLOSE_ANIMATION_MS);
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <div
      onClick={close}
      className={`fixed inset-0 z-50 flex justify-center bg-stone-900/20 px-4 py-6 backdrop-blur-sm sm:justify-end sm:px-6 ${
        closing ? "animate-overlay-out" : "animate-overlay-in"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={`h-fit max-h-full w-full max-w-md origin-top overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl sm:origin-top-right ${
          closing ? "animate-panel-out" : "animate-panel-in"
        }`}
      >
        {children(close)}
      </div>
    </div>
  );
}

export function PanelHeader({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
      {children}
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-2 py-1 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
      >
        Close
      </button>
    </div>
  );
}
