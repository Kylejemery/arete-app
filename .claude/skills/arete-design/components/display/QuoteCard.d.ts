export interface QuoteCardProps {
  /** The quotation. Rendered italic 14/22 in warm off-white. */
  quote: React.ReactNode;
  /** Author, in gold 12px semibold. */
  attribution?: React.ReactNode;
  /** Show the oversized gold opening quote glyph. Default true. */
  glyph?: boolean;
  /** Pass an <Icon /> instead of the glyph — the morning-affirmation variant, which also turns the text gold. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function QuoteCard(props: QuoteCardProps): JSX.Element;
