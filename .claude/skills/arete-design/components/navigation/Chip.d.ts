export interface ChipProps {
  /** Active: 20% gold tint, solid gold border, gold text. */
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Chip(props: ChipProps): JSX.Element;
