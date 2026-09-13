export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Render a textarea instead (sheet composers, journal entries). */
  multiline?: boolean;
  rows?: number;
}
export declare function Input(props: InputProps): JSX.Element;
