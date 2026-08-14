"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/useSession";

interface AccountMenuProps {
  user: SessionUser;
  mailConfigured: boolean;
  /** How many renewals are mirrored to the server for the reminder job. */
  syncedCount: number;
  onToggleEmails: (enabled: boolean) => void;
  onSignOut: () => void;
}

/**
 * Avatar button plus a small popover.
 *
 * Deliberately not a full panel like the calendar: everything here is one line
 * of status, one switch, and one way out. A large surface would suggest there is
 * more to configure than there is.
 */
export function AccountMenu({
  user,
  mailConfigured,
  syncedCount,
  onToggleEmails,
  onSignOut,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [testState, setTestState] = useState<
    { status: "idle" | "sending" } | { status: "done" | "error"; message: string }
  >({ status: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape, the two things a popover must handle.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function sendTestEmail() {
    setTestState({ status: "sending" });
    try {
      const response = await fetch("/api/reminders/test-email", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      setTestState(
        response.ok
          ? { status: "done", message: `Sent to ${user.email}` }
          : { status: "error", message: data.error ?? "Could not send" },
      );
    } catch {
      setTestState({ status: "error", message: "Could not send" });
    }
  }

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Your account"
        className="group relative grid h-10 w-10 place-items-center rounded-full border border-emerald-900/15 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      >
        {user.picture ? (
          <Image
            src={user.picture}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
            {initial}
          </span>
        )}

        {/* Small badge showing at a glance whether emails are on. */}
        <span
          aria-hidden="true"
          className={`absolute -top-0.5 -right-0.5 grid h-4.5 w-4.5 place-items-center rounded-full border-2 border-white text-white ${
            user.emailRemindersEnabled ? "bg-emerald-600" : "bg-stone-400"
          }`}
        >
          <EnvelopeIcon />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="absolute right-0 z-[60] mt-2 w-72 origin-top-right animate-popover-in rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
        >
          <p className="truncate text-sm font-semibold text-stone-900">
            {user.name ?? "Signed in"}
          </p>
          <p className="truncate text-xs text-stone-500">{user.email}</p>

          <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
            <p>
              {syncedCount} renewal{syncedCount === 1 ? "" : "s"} synced for
              email reminders
            </p>
            <p>
              {user.lastEmailedAt
                ? `Last email ${new Date(user.lastEmailedAt).toLocaleDateString()}`
                : "No reminder emailed yet"}
            </p>
          </div>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
            <span className="text-sm font-medium text-stone-800">
              Email reminders
            </span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={user.emailRemindersEnabled}
                onChange={(event) => onToggleEmails(event.target.checked)}
                className="peer sr-only"
              />
              {/* Decorative track and knob; the sr-only input above stays the control. */}
              <span className="pointer-events-none h-5 w-9 rounded-full bg-stone-300 transition peer-checked:bg-emerald-600" />
              <span className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
          </label>

          {mailConfigured && (
            <button
              type="button"
              onClick={sendTestEmail}
              disabled={testState.status === "sending"}
              className="mt-2 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-800/30 hover:bg-stone-50 disabled:opacity-60"
            >
              {testState.status === "sending"
                ? "Sending…"
                : "Send me one now"}
            </button>
          )}

          {"message" in testState && (
            <p
              className={`mt-2 text-xs ${
                testState.status === "error" ? "text-red-700" : "text-emerald-800"
              }`}
            >
              {testState.message}
            </p>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="mt-3 w-full rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-stone-50 hover:text-stone-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function EnvelopeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-2.5 w-2.5"
    >
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M3 6l7 5 7-5" />
    </svg>
  );
}
