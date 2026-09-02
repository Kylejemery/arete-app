/** Shelf glyph for The Library card. */
export default function LibraryIcon({ size = 20, color = '#c9a84c' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4h4v16H4z" />
      <path d="M10 4h4v16h-4z" />
      <path d="m16.5 5.2 3.4.9-3.4 13-3.4-.9z" />
    </svg>
  );
}
