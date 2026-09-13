export interface ScreenHeaderProps {
  /** 26px bold gold screen title. */
  title: React.ReactNode;
  /** 12px muted line under the title. */
  subtitle?: React.ReactNode;
  /** Small-caps 60%-gold roster line, e.g. "Marcus · Seneca · Epictetus". */
  smallCaps?: React.ReactNode;
  /** Trailing element: an IconButton or a StreakPill. */
  right?: React.ReactNode;
  /** Add the 13% gold bottom hairline (used when tabs follow). */
  divider?: boolean;
  style?: React.CSSProperties;
}
export declare function ScreenHeader(props: ScreenHeaderProps): JSX.Element;
