export interface AcademyCardProps {
  /** Tracked uppercase 70%-gold label, e.g. "Course". */
  kicker?: React.ReactNode;
  /** Playfair Display 18px parchment title. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function AcademyCard(props: AcademyCardProps): JSX.Element;
