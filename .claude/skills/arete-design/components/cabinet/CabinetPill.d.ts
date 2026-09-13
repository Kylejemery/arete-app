export interface CabinetPillProps {
  /** Gold border and 10% gold fill. */
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function CabinetPill(props: CabinetPillProps): JSX.Element;
