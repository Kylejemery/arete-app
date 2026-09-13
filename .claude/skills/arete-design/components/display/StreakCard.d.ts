export interface StreakCardProps {
  /** The hero number, 52px bold gold. */
  count: number | string;
  label?: React.ReactNode;
  /** Italic muted line under the label. */
  note?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function StreakCard(props: StreakCardProps): JSX.Element;
