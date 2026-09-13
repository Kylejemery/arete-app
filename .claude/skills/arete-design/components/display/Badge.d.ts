export interface BadgeProps {
  /** Counselor category, challenge level, or a chrome tone.
   *  gold = solid gold "BEST VALUE" label. outline = 15% gold "Starter".
   *  locked = grey #222 pill used with a filled lock glyph. */
  tone?: 'stoics' | 'warriors' | 'athletes' | 'builders' | 'writers' | 'spiritual'
       | 'direct' | 'firm' | 'gentle' | 'gold' | 'outline' | 'locked';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
