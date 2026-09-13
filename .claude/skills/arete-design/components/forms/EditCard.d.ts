export interface EditCardProps {
  value?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** Primary action label. Default "Add". */
  confirmLabel?: string;
  style?: React.CSSProperties;
}
export declare function EditCard(props: EditCardProps): JSX.Element;
