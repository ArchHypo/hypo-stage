import { Typography, Button, Paper, CircularProgress, Grid } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import { useStyles } from '../hooks/useStyles';
import { EntityRefMultiSelect } from './EntityRefSelect';
import { QualityAttributesSection } from './forms/sections/QualityAttributesSection';
import { RelatedArtefactsSection } from './forms/sections/RelatedArtefactsSection';
import { useCreateHypothesis } from '../hooks/forms/useCreateHypothesis';
import { CustomSelectField, CustomTextField } from './FormField';
import { validateHypothesisStatement } from '../utils/validators';
import { SOURCE_TYPE_OPTIONS } from '../utils/constants';
import { LikertScaleField } from './forms/LikertScaleField';
import { getRatingNumber, getRatingString } from '../utils/formatters';

interface CreateHypothesisProps {
  onHypothesisCreated?: () => void;
}

export const CreateHypothesis = ({ onHypothesisCreated }: CreateHypothesisProps) => {
  const classes = useStyles();
  const { formData, updateField, loading, isFormValid, handleSubmit } = useCreateHypothesis();

  const onSubmit = () => {
    handleSubmit(onHypothesisCreated);
  };

  const statementValidation = validateHypothesisStatement(formData.statement);

  return (
    <Paper className={classes.formContainer} elevation={0}>
      <Typography className={classes.formTitle}>
        <Add />
        Create New Hypothesis
      </Typography>
      <Typography className={classes.formSubtitle}>
        Define your hypothesis and assess its uncertainty and potential impact
      </Typography>

      <div className={classes.formGrid}>
        <Grid container spacing={3}>
          {/* Entity references */}
          <Grid item xs={12}>
            <EntityRefMultiSelect
              value={formData.entityRefs}
              onChange={(value) => updateField('entityRefs', value)}
              label="Entity References"
              required
              className={classes.inputField}
            />
            {formData.entityRefs.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                Please select at least one entity reference for this hypothesis.
              </Typography>
            )}
          </Grid>

          {/* Hypothesis statement */}
          <Grid item xs={12}>
            <CustomTextField
              label="Hypothesis Statement"
              value={formData.statement}
              onChange={(value) => updateField('statement', value)}
              required
              multiline
              rows={4}
              placeholder="e.g., The current access control library is compatible with the organization's Single Sign-On protocol."
              helperText={`${formData.statement.length}/500 characters`}
            />
            {!statementValidation.isValid && formData.statement.length > 0 && (
              <Typography variant="body2" color="error" className={classes.validationMessage}>
                ⚠️ {statementValidation.message}
              </Typography>
            )}
          </Grid>

          {/* Source type */}
          <Grid item xs={12}>
            <CustomSelectField
              label="Source Type"
              value={formData.sourceType}
              onChange={(value) => updateField('sourceType', value)}
              options={SOURCE_TYPE_OPTIONS}
              required
            />
          </Grid>

          {/* Uncertainty level */}
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.uncertainty ? getRatingNumber(formData.uncertainty) : 0}
              onRatingChange={(rating) => updateField('uncertainty', getRatingString(rating))}
              label="Uncertainty Level"
              description="How far is the team from validating/falsifying this hypothesis?"
            />
          </Grid>

          {/* Impact level */}
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.impact ? getRatingNumber(formData.impact) : 0}
              onRatingChange={(rating) => updateField('impact', getRatingString(rating))}
              label="Impact Level"
              description="What is the potential impact on the system if the hypothesis proves false?"
            />
          </Grid>

          {/* Quality attributes */}
          <QualityAttributesSection
            qualityAttributes={formData.qualityAttributes}
            onQualityAttributesChange={(value) => updateField('qualityAttributes', value)}
          />

          {/* Related artefacts */}
          <RelatedArtefactsSection
            relatedArtefacts={formData.relatedArtefacts}
            onRelatedArtefactsChange={(value) => updateField('relatedArtefacts', value)}
          />

          {/* Notes */}
          <Grid item xs={12}>
            <CustomTextField
              label="Notes/Comments"
              value={formData.notes}
              onChange={(value) => updateField('notes', value)}
              multiline
              rows={4}
              placeholder="Additional notes, comments, or observations about this hypothesis..."
              helperText="Optional: Add any additional context, observations, or comments"
            />
          </Grid>
        </Grid>

        <div className={classes.fullWidth}>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!isFormValid || loading}
            className={classes.submitButton}
            size="large"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {loading ? 'Submitting...' : 'Submit Hypothesis'}
          </Button>
        </div>
      </div>
    </Paper>
  );
};
