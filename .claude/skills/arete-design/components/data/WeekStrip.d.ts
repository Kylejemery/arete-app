export interface WeekStripDay {
  /** Weekday initial. */
  letter: string;
  date: number | string;
  /** Morning routine done — gold dot. */
  morning?: boolean;
  /** Evening reflection done — blue dot. */
  evening?: boolean;
  /** Today's column: gold bold date. */
  today?: boolean;
}
export interface WeekStripProps {
  label?: React.ReactNode;
  days: WeekStripDay[];
  style?: React.CSSProperties;
}
export declare function WeekStrip(props: WeekStripProps): JSX.Element;
