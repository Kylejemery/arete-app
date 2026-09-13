export interface RoutineToggleProps {
  value?: 'morning' | 'evening';
  onChange?: (v: string) => void;
  /** The shipped pills use a sun and moon emoji. Set false to omit the glyph row. */
  useEmoji?: boolean;
  style?: React.CSSProperties;
}
export declare function RoutineToggle(props: RoutineToggleProps): JSX.Element;
