export interface GlassCardProps {
  /** Omit for the 4% white glass surface; 'gold' for the 15% gold wash (the user's turn). */
  tint?: 'gold';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function GlassCard(props: GlassCardProps): JSX.Element;
