/**
 * The Arete button. Primary is a solid gold block with ink text.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = solid gold / ink text. secondary = 13% gold tint, 53% gold border.
   *  ghost = bare muted text. danger = solid red. dashed = full-width add affordance. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed';
  /** lg = tall CTA (16/24, 17px). md = 11/18, 14px. sm = 8/18, 13px. pill = tracked uppercase 10px. */
  size?: 'lg' | 'md' | 'sm' | 'pill';
  disabled?: boolean;
  fullWidth?: boolean;
  /** Leading icon element, usually <Icon />. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
