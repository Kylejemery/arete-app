/**
 * The card that builds a Cabinet.
 */
export interface CounselorCardProps {
  name: React.ReactNode;
  /** One of the six counselor categories. */
  category?: 'stoics' | 'warriors' | 'athletes' | 'builders' | 'writers' | 'spiritual';
  /** How blunt they are. */
  level?: 'direct' | 'firm' | 'gentle';
  /** One sentence, muted 13/18. */
  blurb?: React.ReactNode;
  /** 2px gold border plus a gold check. */
  selected?: boolean;
  /** Dim to 55% with a grey lock badge; not tappable. */
  locked?: boolean;
  /** Future Self: gold "Always Present" line in place of the check. */
  alwaysPresent?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function CounselorCard(props: CounselorCardProps): JSX.Element;
