export interface PlanCardProps {
  name: React.ReactNode;
  /** "Two months free", "Cancel any time". */
  note?: React.ReactNode;
  price: React.ReactNode;
  /** "per year", "per month". */
  period?: React.ReactNode;
  /** Solid-gold label above the row, e.g. "Best value". */
  badge?: React.ReactNode;
  /** Raises the border to 33% gold. */
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PlanCard(props: PlanCardProps): JSX.Element;
