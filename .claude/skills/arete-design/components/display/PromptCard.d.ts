export interface PromptCardProps {
  /** Dim gold kicker above the question. Default "Today's question". */
  label?: React.ReactNode;
  question: React.ReactNode;
  /** Which counselor is asking, in gold. */
  attribution?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PromptCard(props: PromptCardProps): JSX.Element;
