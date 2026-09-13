export interface ChatBubbleProps {
  /** user = right, 15% gold wash, solid gold border, 4px bottom-right tail.
   *  counselor = left, surface, gold hairline, 4px bottom-left tail. */
  from?: 'user' | 'counselor';
  /** Counselor name, shown as a gold kicker above the reply. */
  speaker?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function ChatBubble(props: ChatBubbleProps): JSX.Element;
