export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}
export declare function SearchBar(props: SearchBarProps): JSX.Element;
