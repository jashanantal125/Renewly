"use client";

export interface ToastMessage {
  /** Changes on every save so a repeat action replays the animation. */
  key: number;
  title: string;
  body: string;
}

/**
 * Confirmation after saving. The body says when the item will actually nudge,
 * so "saved" carries real information rather than just reassurance.
 */
export function Toast({
  message,
  durationMs,
  onDismiss,
}: {
  message: ToastMessage;
  durationMs: number;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4 sm:justify-end sm:px-6"
    >
      <div
        key={message.key}
        className="animate-toast-in pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-emerald-900/10 bg-white shadow-lg"
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="animate-pop mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-800 text-white">
            <CheckIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">
              {message.title}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-stone-600">
              {message.body}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md px-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            ✕
          </button>
        </div>
        {/* Shows the auto-dismiss running down, so it does not vanish unexplained. */}
        <span
          className="animate-toast-progress block h-0.5 bg-emerald-700/40"
          style={{ animationDuration: `${durationMs}ms` }}
        />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="m5 10.5 3.5 3.5L15 7" />
    </svg>
  );
}
