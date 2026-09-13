export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** card = 20% gold. hairline = 13% gold. selected = 2px solid gold. plain = #2a3a5c. dim = #333. */
  border?: 'card' | 'hairline' | 'selected' | 'plain' | 'dim';
  /** Replace the left border with the 3px gold accent rule (quotes, prompts, affirmations). */
  accentRule?: boolean;
  /** Invert to a solid gold fill with ink text — the completed-task state. */
  done?: boolean;
  /** 14-24. 16 default, 20 for quote and prompt cards, 24 for the streak card. */
  padding?: number | string;
  radius?: string;
  background?: string;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
