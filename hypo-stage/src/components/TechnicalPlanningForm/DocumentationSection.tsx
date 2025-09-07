import { Grid } from '@material-ui/core';
import { UrlListField } from '../forms/UrlListField';

interface DocumentationSectionProps {
  documentations: string[];
  onDocumentationsChange: (value: string[]) => void;
  className?: string;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({
  documentations,
  onDocumentationsChange,
  className
}) => {
  return (
    <Grid item xs={12} className={className}>
      <UrlListField
        label="Documentation Links (Multiple)"
        urls={documentations}
        onUrlsChange={onDocumentationsChange}
        placeholder="https://example.com/docs"
        helperText="No documentation links added yet. Add links to relevant documentation, design docs, or planning materials."
      />
    </Grid>
  );
};
