export interface CounselorRowProps {
  name: React.ReactNode;
  /** "Stoic · direct" — school and challenge level, middot separated. */
  meta?: React.ReactNode;
  /** Letter in the 48px well. Defaults to the first letter of name. */
  initial?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function CounselorRow(props: CounselorRowProps): JSX.Element;
