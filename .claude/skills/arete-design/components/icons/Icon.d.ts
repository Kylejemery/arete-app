export type AreteGlyph =
  | 'home' | 'sunny' | 'moon' | 'mic' | 'book' | 'library' | 'newspaper' | 'trophy'
  | 'send' | 'checkmark' | 'add' | 'close' | 'chevronForward' | 'search'
  | 'flame' | 'lockClosed';

export interface IconProps {
  /** Glyph name. Ionicons-outline equivalents drawn from the shipped previews. */
  name: AreteGlyph;
  /** Box size in px. 18 inline, 22 in the tab bar, 14 inside badges. */
  size?: number;
  /** Outline stroke width. 1.8 inline, 1.7 in the tab bar. */
  strokeWidth?: number;
  /** Force fill vs stroke. Defaults: filled for flame and lockClosed only. */
  filled?: boolean;
  /** Stroke/fill color. Defaults to currentColor. */
  color?: string;
  style?: React.CSSProperties;
}
export declare const areteGlyphs: Record<AreteGlyph, string>;
export declare function Icon(props: IconProps): JSX.Element | null;
