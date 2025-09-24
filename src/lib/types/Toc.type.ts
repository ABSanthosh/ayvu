/**
 * Interface for table of contents entry
 */
export interface TocEntry {
  id: string;
  title: string;
  level: 'section' | 'subsection' | 'subsubsection';
  tag: string;
  children?: TocEntry[];
}
