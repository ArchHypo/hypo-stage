import { Grid, TextField } from '@material-ui/core';
import { CustomSelectField } from './FormField';
import { LikertScaleField } from './forms/LikertScaleField';
import { QualityAttributesSection } from './forms/sections/QualityAttributesSection';
import { RelatedArtefactsSection } from './forms/sections/RelatedArtefactsSection';
import { SOURCE_TYPE_OPTIONS, STATUS_OPTIONS } from '../utils/constants';
import { getRatingNumber, getRatingString } from '../utils/formatters';
import { Status, SourceType, QualityAttribute, LikertScale } from '@internal/plugin-hypo-stage-backend';

interface EditHypothesisFormData {
  status: Status | '';
  sourceType: SourceType | '';
  relatedArtefacts: string[];
  qualityAttributes: QualityAttribute[];
  uncertainty: LikertScale | '';
  impact: LikertScale | '';
  notes: string;
}

interface EditHypothesisProps {
  hypothesis: any; // Hypothesis type
  formData: EditHypothesisFormData;
  onFieldChange: (field: keyof EditHypothesisFormData, value: any) => void;
  className?: string;
}

export const EditHypothesis: React.FC<EditHypothesisProps> = ({
  hypothesis,
  formData,
  onFieldChange,
  className
}) => {
  return (
    <Grid container spacing={3} className={className}>
      {/* Hypothesis Statement (Read-only) */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Hypothesis Statement"
          value={hypothesis.statement}
          multiline
          minRows={4}
          variant="outlined"
          InputProps={{
            readOnly: true,
          }}
          helperText="Statement cannot be edited (read-only)"
        />
      </Grid>

      {/* Entity References (Read-only) */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Entity References"
          value={hypothesis.entityRefs?.join(', ') || 'None'}
          variant="outlined"
          InputProps={{
            readOnly: true,
          }}
          helperText="Entity references cannot be edited (read-only)"
        />
      </Grid>

      {/* Status and Source Type */}
      <Grid item xs={12} md={6}>
        <CustomSelectField
          label="Status"
          value={formData.status}
          onChange={(value) => onFieldChange('status', value)}
          options={STATUS_OPTIONS}
          required
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <CustomSelectField
          label="Source Type"
          value={formData.sourceType}
          onChange={(value) => onFieldChange('sourceType', value)}
          options={SOURCE_TYPE_OPTIONS}
          required
        />
      </Grid>

      {/* Uncertainty and Impact */}
      <Grid item xs={12} md={6}>
        <LikertScaleField
          rating={formData.uncertainty ? getRatingNumber(formData.uncertainty) : 0}
          onRatingChange={(rating) => onFieldChange('uncertainty', getRatingString(rating))}
          label="Uncertainty"
          description="Rate the level of uncertainty about this hypothesis"
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <LikertScaleField
          rating={formData.impact ? getRatingNumber(formData.impact) : 0}
          onRatingChange={(rating) => onFieldChange('impact', getRatingString(rating))}
          label="Impact"
          description="Rate the potential impact of this hypothesis"
        />
      </Grid>

      {/* Quality Attributes */}
      <QualityAttributesSection
        qualityAttributes={formData.qualityAttributes}
        onQualityAttributesChange={(value) => onFieldChange('qualityAttributes', value)}
      />

      {/* Related Artefacts */}
      <RelatedArtefactsSection
        relatedArtefacts={formData.relatedArtefacts}
        onRelatedArtefactsChange={(value) => onFieldChange('relatedArtefacts', value)}
      />

      {/* Notes */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Additional Notes"
          value={formData.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          multiline
          rows={4}
          variant="outlined"
          placeholder="Any additional context or notes about this hypothesis..."
        />
      </Grid>
    </Grid>
  );
};
