export interface KickerProps {
  /** kicker = 10px / 1.2px tracking (card labels). eyebrow = 11px / 3px tracking (page eyebrows). */
  variant?: 'kicker' | 'eyebrow';
  /** Drop to 53% gold — used for secondary card labels like "Prompt". */
  dim?: boolean;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Kicker(props: KickerProps): JSX.Element;
