export interface SubmissionNoticeProps {
  /** Where the essay is in the editorial queue. */
  state?: 'draft' | 'pending' | 'published' | 'returned';
  /** Override the default sentence. */
  note?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SubmissionNotice(props: SubmissionNoticeProps): JSX.Element;
