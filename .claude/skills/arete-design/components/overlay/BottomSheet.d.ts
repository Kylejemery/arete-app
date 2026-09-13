export interface BottomSheetProps {
  /** 20px bold gold sheet title. */
  title?: React.ReactNode;
  /** Muted line under it. */
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element;
