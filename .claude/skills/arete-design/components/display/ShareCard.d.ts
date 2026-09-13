/**
 * What leaves the app: the shareable quote card.
 */
export interface ShareCardProps {
  quote: React.ReactNode;
  /** Counselor name, tracked uppercase gold. */
  attribution: React.ReactNode;
  /** Small provenance line. Default "via the Cabinet". */
  source?: React.ReactNode;
  wordmark?: React.ReactNode;
  url?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function ShareCard(props: ShareCardProps): JSX.Element;
