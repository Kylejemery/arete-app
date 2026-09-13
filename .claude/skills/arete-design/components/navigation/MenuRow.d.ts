import type { AreteGlyph } from '../icons/Icon';

export interface MenuRowProps {
  icon: AreteGlyph;
  /** Warm off-white 16px title. */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClick?: () => void;
  /** Drop the 5% white divider on the last row. */
  last?: boolean;
  style?: React.CSSProperties;
}
export declare function MenuRow(props: MenuRowProps): JSX.Element;
