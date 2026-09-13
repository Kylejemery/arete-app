export interface EssayRowProps {
  title: React.ReactNode;
  /** Author name, gold semibold. No avatar: the system has no profile imagery. */
  author: React.ReactNode;
  /** Date and reading time, e.g. "Sep 12 · 9 min". */
  meta?: React.ReactNode;
  /** First sentence or two, muted. */
  excerpt?: React.ReactNode;
  /** Topic tags, rendered as dim gold kickers. */
  tags?: string[];
  /** Comment count. */
  comments?: number | string;
  /** Name of a counselor who was invited to answer, shown as a gold kicker. */
  counselor?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function EssayRow(props: EssayRowProps): JSX.Element;
