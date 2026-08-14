import type { RenewalType } from "@/lib/types";

const PATHS: Record<RenewalType, React.ReactNode> = {
  passport: (
    <>
      <path d="M5 3.5h8.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
      <circle cx="9.5" cy="8.5" r="2" />
      <path d="M7.5 13h4" />
    </>
  ),
  licence: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="1.75" />
      <circle cx="7" cy="9.5" r="1.6" />
      <path d="M11 8.5h4M11 11.5h2.5" />
    </>
  ),
  road_tax: (
    <>
      <path d="M3.5 12.5v-2l1.6-3.4A1.5 1.5 0 0 1 6.45 6.2h7.1a1.5 1.5 0 0 1 1.35.9l1.6 3.4v2" />
      <path d="M3.5 12.5h13" />
      <circle cx="6.5" cy="13.5" r="1.25" />
      <circle cx="13.5" cy="13.5" r="1.25" />
    </>
  ),
  insurance: (
    <>
      <path d="M10 3 4.5 5v4.5c0 3.3 2.3 6 5.5 7 3.2-1 5.5-3.7 5.5-7V5L10 3Z" />
      <path d="m7.75 9.75 1.6 1.6 3-3.2" />
    </>
  ),
  subscription: (
    <>
      <path d="M4 8.5A5.5 5.5 0 0 1 14 6" />
      <path d="M16 11.5A5.5 5.5 0 0 1 6 14" />
      <path d="M14 3.5V6h-2.5M6 16.5V14h2.5" />
    </>
  ),
  other: (
    <>
      <path d="M10.6 3.4H5.5a2 2 0 0 0-2 2v5.1a2 2 0 0 0 .6 1.4l4.4 4.4a1.5 1.5 0 0 0 2.1 0l4.5-4.5a1.5 1.5 0 0 0 0-2.1L10.6 3.4Z" />
      <circle cx="7.25" cy="7.25" r="1" />
    </>
  ),
};

export function TypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: RenewalType;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[type]}
    </svg>
  );
}
