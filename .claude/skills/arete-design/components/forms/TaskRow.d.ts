export interface TaskRowProps {
  title: React.ReactNode;
  /** Secondary line, muted 12px. Hidden when done. */
  note?: React.ReactNode;
  /** Completed: the whole card inverts to solid gold with ink strikethrough text. */
  done?: boolean;
  onToggle?: () => void;
  style?: React.CSSProperties;
}
export declare function TaskRow(props: TaskRowProps): JSX.Element;
