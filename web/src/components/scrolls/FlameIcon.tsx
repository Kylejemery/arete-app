/** The read-streak flame the mobile app draws with Ionicons. */
export default function FlameIcon({ size = 13, color = '#c9a84c' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2c.3 2.6-.9 4.3-2.3 5.8C8.1 9.5 6.5 11.1 6.5 14a5.5 5.5 0 0 0 11 0c0-2.2-1-3.8-2.1-5.2-.4 .8-1 1.4-1.8 1.7.5-2.6-.3-5.4-1.6-8.5Zm0 17.5a3 3 0 0 1-3-3c0-1.5.9-2.4 1.7-3.3.5-.5 1-1.1 1.3-1.8.4.6.8 1.1 1.2 1.6.8 1 1.8 2 1.8 3.5a3 3 0 0 1-3 3Z" />
    </svg>
  );
}
