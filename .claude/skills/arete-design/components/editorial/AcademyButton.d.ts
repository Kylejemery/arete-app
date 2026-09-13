export interface AcademyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** solid = gold fill, ink text. outline = gold hairline, gold text. */
  variant?: 'solid' | 'outline';
  children?: React.ReactNode;
}
export declare function AcademyButton(props: AcademyButtonProps): JSX.Element;
