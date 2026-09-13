export interface CommentProps {
  /** Reader name (gold semibold) or counselor name (gold kicker). */
  author: React.ReactNode;
  /** Relative time, faint. */
  time?: React.ReactNode;
  /** A counselor's reply: gold kicker name, 3px accent rule, italic warm text. */
  counselor?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Comment(props: CommentProps): JSX.Element;
