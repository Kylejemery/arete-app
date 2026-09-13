export interface AreteTab { key: string; label: string; icon: string }

export interface TabBarProps {
  /** Defaults to the shipped eight-tab set exported as ARETE_TABS. */
  tabs?: AreteTab[];
  value: string;
  onChange?: (key: string) => void;
  style?: React.CSSProperties;
}
export declare const ARETE_TABS: AreteTab[];
export declare function TabBar(props: TabBarProps): JSX.Element;
