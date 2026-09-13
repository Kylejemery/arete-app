export interface DispatchCardProps {
  /** "Dispatch from Epictetus" — rendered as a tracked uppercase gold label. */
  from: React.ReactNode;
  /** Relative time, faint, right-aligned. */
  time?: React.ReactNode;
  title: React.ReactNode;
  body: React.ReactNode;
  /** Right-aligned gold affordance. Pass null to hide. */
  action?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function DispatchCard(props: DispatchCardProps): JSX.Element;
