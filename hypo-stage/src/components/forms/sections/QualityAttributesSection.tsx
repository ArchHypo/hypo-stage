import { Grid, Typography } from '@material-ui/core';
import { CustomSelectField } from '../../FormField';
import { QUALITY_ATTRIBUTE_OPTIONS } from '../../../utils/constants';
import { QualityAttribute } from '@internal/plugin-hypo-stage-backend';
import { useStyles } from '../../../hooks/useStyles';

interface QualityAttributesSectionProps {
  qualityAttributes: QualityAttribute[];
  onQualityAttributesChange: (value: QualityAttribute[]) => void;
  className?: string;
}

export const QualityAttributesSection: React.FC<QualityAttributesSectionProps> = ({
  qualityAttributes,
    onQualityAttributesChange,
  className
}) => {
  const classes = useStyles();

  return (
    <Grid item xs={12} className={className}>
      <div className={classes.sectionContainer}>
        <Typography variant="h6" gutterBottom>
          Quality Attributes
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Select the quality attributes that this hypothesis addresses
        </Typography>
        <CustomSelectField
          label="Quality Attributes"
          value={qualityAttributes}
          onChange={(value) => onQualityAttributesChange(value as QualityAttribute[])}
          options={QUALITY_ATTRIBUTE_OPTIONS}
          multiple
        />
        {qualityAttributes.length === 0 && (
          <Typography variant="body2" color="textSecondary" className={classes.secondaryText}>
            Please select at least one quality attribute that this hypothesis affects.
          </Typography>
        )}
      </div>
    </Grid>
  );
};
