export interface ReflectionCardProps {
  /** Entry type, gold 12px. Default "Reflection". */
  label?: React.ReactNode;
  /** Short date, faint. */
  date?: React.ReactNode;
  /** The question that was asked, italic muted. */
  prompt?: React.ReactNode;
  /** What the user wrote. */
  body: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function ReflectionCard(props: ReflectionCardProps): JSX.Element;
