declare module 'react-markdown' {
  import { ComponentType } from 'react';

  export interface ReactMarkdownProps {
    children?: string;
    [key: string]: unknown;
  }
  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
