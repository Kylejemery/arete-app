import type { AreteGlyph } from './Icon';

export interface IconWellProps {
  /** Glyph to render inside the well. Omit and pass children for an initial. */
  name?: AreteGlyph;
  /** Diameter in px. 38 and 40 in menu rows, 44 default, 48 in counselor rows. */
  size?: number;
  /** 'strong' = 15% gold fill / 30% hairline. 'soft' = 8% fill / 20% hairline. */
  tint?: 'strong' | 'soft';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function IconWell(props: IconWellProps): JSX.Element;
