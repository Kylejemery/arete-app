export interface SidePanelProps {
  /** Tracked uppercase gold wordmark at the top. Default "Arete". */
  title?: React.ReactNode;
  /** Italic faint line at the bottom, e.g. "Build 89". */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** MenuRow children. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SidePanel(props: SidePanelProps): JSX.Element;
