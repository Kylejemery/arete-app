export interface SegmentedTabsProps {
  /** Segment labels. */
  items: string[];
  value: string;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
}
export declare function SegmentedTabs(props: SegmentedTabsProps): JSX.Element;
