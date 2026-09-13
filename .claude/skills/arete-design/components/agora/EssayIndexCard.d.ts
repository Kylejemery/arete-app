export interface EssayIndexCardProps {
  /** Tracked uppercase label, e.g. "Essay" or "From the editor". */
  kicker?: React.ReactNode;
  /** Playfair Display 22px parchment title. */
  title: React.ReactNode;
  author: React.ReactNode;
  /** Date and reading time. */
  meta?: React.ReactNode;
  excerpt?: React.ReactNode;
  tags?: string[];
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function EssayIndexCard(props: EssayIndexCardProps): JSX.Element;
