export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** gold = solid gold circle (send, FAB). surface = surface + gold hairline circle.
   *  header = surface + gold hairline with a 12px card radius (screen header buttons). */
  variant?: 'gold' | 'surface' | 'header';
  /** 56 for the FAB, 40 for send, 36-40 for header, 32 inside cards. */
  size?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
