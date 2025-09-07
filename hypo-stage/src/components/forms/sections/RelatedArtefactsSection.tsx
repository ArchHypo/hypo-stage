import { Grid, Typography } from '@material-ui/core';
import { UrlListField } from '../UrlListField';
import { useStyles } from '../../../hooks/useStyles';

interface RelatedArtefactsSectionProps {
  relatedArtefacts: string[];
  onRelatedArtefactsChange: (value: string[]) => void;
  className?: string;
}

export const RelatedArtefactsSection: React.FC<RelatedArtefactsSectionProps> = ({
  relatedArtefacts,
  onRelatedArtefactsChange,
  className
}) => {
  const classes = useStyles();

  return (
    <Grid item xs={12} className={className}>
      <div className={classes.sectionContainer}>
        <Typography variant="h6" gutterBottom>
          Related Artefacts
        </Typography>
        <UrlListField
          label="Related Artefacts / Links"
          urls={relatedArtefacts}
          onUrlsChange={onRelatedArtefactsChange}
          placeholder="https://example.com/artefact"
          helperText="No related artefacts or links added yet. Add links to relevant documentation, code repositories, or other resources."
        />
      </div>
    </Grid>
  );
};
