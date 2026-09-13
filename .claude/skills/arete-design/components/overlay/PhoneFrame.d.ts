export interface PhoneFrameProps {
  /** Screen content: a scroll body plus a TabBar. */
  children?: React.ReactNode;
  /** Default 640. */
  minHeight?: number;
  style?: React.CSSProperties;
}
export declare function PhoneFrame(props: PhoneFrameProps): JSX.Element;
