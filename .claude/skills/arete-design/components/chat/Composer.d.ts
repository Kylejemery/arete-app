export interface ComposerProps {
  value?: string;
  /** Default "Speak to your cabinet". */
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend?: () => void;
  /** Empty input: the send key goes surface with a faint border. */
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Composer(props: ComposerProps): JSX.Element;
