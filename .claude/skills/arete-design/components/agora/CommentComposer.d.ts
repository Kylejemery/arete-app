export interface CommentComposerProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: () => void;
  /** Not a subscriber: render the dashed gold lock affordance instead of the field. */
  locked?: boolean;
  /** Called when the locked affordance is tapped, usually to open the paywall. */
  onUnlock?: () => void;
  placeholder?: string;
  style?: React.CSSProperties;
}
export declare function CommentComposer(props: CommentComposerProps): JSX.Element;
