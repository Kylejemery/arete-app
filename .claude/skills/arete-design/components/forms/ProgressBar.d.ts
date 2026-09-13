export interface ProgressBarProps {
  /** 0-100. */
  value: number;
  /** Left label, e.g. "2 of 4 complete". */
  label?: React.ReactNode;
  /** Gold percentage on the right. Default true. */
  showPercent?: boolean;
  style?: React.CSSProperties;
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
