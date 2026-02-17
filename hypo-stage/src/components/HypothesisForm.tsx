import { default as React } from 'react';
import { Typography, Button, Paper, CircularProgress, Grid, Box } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import Save from '@material-ui/icons/Save';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';
import { CreateHypothesisFormData } from '../hooks/forms/useCreateHypothesis';
import { EditHypothesisFormData } from '../hooks/forms/useEditHypothesis';
import { validateHypothesisStatement } from '../utils/validators';
import { QUALITY_ATTRIBUTE_OPTIONS, SOURCE_TYPE_OPTIONS, STATUS_OPTIONS } from '../utils/constants';
import { getRatingNumber, getRatingString } from '../utils/formatters';
import { CustomSelectField, CustomTextField } from './forms/FormField';
import { EntityReferencesAutocomplete } from './forms/EntityReferencesAutocomplete';
import { QualityAttributesField } from './forms/QualityAttributesField';
import { LikertScaleField } from './forms/LikertScaleField';
import { UrlListField } from './forms/UrlListField';
import { useStyles } from '../hooks/useStyles';

interface BaseHypothesisFormProps {
  isFormValid: boolean;
  loading: boolean;
  onSubmit?: () => void;
}

interface CreateHypothesisFormProps extends BaseHypothesisFormProps {
  mode: 'create';
  formData: CreateHypothesisFormData;
  onFieldChange: (field: keyof CreateHypothesisFormData, value: any) => void;
}

interface EditHypothesisFormProps extends BaseHypothesisFormProps {
  mode: 'edit';
  hypothesis: Hypothesis;
  formData: EditHypothesisFormData;
  onFieldChange: (field: keyof EditHypothesisFormData, value: any) => void;
}

export const HypothesisForm: React.FC<CreateHypothesisFormProps | EditHypothesisFormProps> = (props) => {
  const classes = useStyles();
  const { mode, formData, onFieldChange, isFormValid, loading, onSubmit } = props;

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const startIcon = isCreateMode ? <Add /> : <Save />;
  const title = isCreateMode ? 'Create New Hypothesis' : 'Update Hypothesis';
  const subtitle = isCreateMode ? 'Define your hypothesis and assess its uncertainty and potential impact' : 'Update your hypothesis and reassess its uncertainty and potential impact';

  const handleSubmit = () => {
    onSubmit?.();
  };

  const statementValidation = isCreateMode && formData.statement
    ? validateHypothesisStatement(formData.statement)
    : { isValid: true, message: '' };

  return (
    <Paper className={classes.formContainer} elevation={0}>
      <Typography className={classes.formTitle}>
        {startIcon}
        {title}
      </Typography>
      <Typography className={classes.formSubtitle}>
        {subtitle}
      </Typography>

      <div className={classes.formGrid}>
        <Grid container spacing={3} style={{ width: '100%', margin: 0 }}>
          {/* Entity references */}
          <Grid item xs={12}>
            <EntityReferencesAutocomplete
              label="Entity References"
              value={formData.entityRefs}
              onChange={(value) => onFieldChange('entityRefs', value)}
              required
              helperText={
                formData.entityRefs.length === 0
                  ? 'Please select at least one entity reference. Type to search catalog components.'
                  : undefined
              }
            />
          </Grid>

          {/* Hypothesis statement */}
          <Grid item xs={12}>
            <CustomTextField
                label="Hypothesis Statement"
                value={isCreateMode ? formData.statement : props.hypothesis.statement}
                onChange={isCreateMode ? (value) => onFieldChange('statement', value) : () => {}}
                required
                disabled={isEditMode}
                rows={4}
                placeholder="e.g., The current access control library is compatible with the organization's Single Sign-On protocol."
                helperText={`${isCreateMode ? formData.statement.length : props.hypothesis.statement.length}/500 characters`}
              />
              {isCreateMode && !statementValidation.isValid && formData.statement.length > 0 && (
                <Typography variant="body2" color="error" className={classes.validationMessage}>
                  ⚠️ {statementValidation.message}
                </Typography>
              )}
          </Grid>

          {/* Status */}
          {isEditMode && (
            <Grid item xs={12} md={6}>
              <CustomSelectField
                label="Status"
                value={formData.status}
                onChange={(value) => onFieldChange('status', value)}
                options={STATUS_OPTIONS}
                required
              />
            </Grid>
          )}

          {/* Source type */}
          <Grid item xs={12} md={isEditMode ? 6 : 12}>
            <CustomSelectField
              label="Source Type"
              value={formData.sourceType}
              onChange={(value) => onFieldChange('sourceType', value)}
              options={SOURCE_TYPE_OPTIONS}
              required
            />
          </Grid>

          {/* Uncertainty level */}
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.uncertainty ? getRatingNumber(formData.uncertainty) : 0}
              onRatingChange={(rating) => onFieldChange('uncertainty', getRatingString(rating))}
              label="Uncertainty Level"
              description="How far is the team from validating/falsifying this hypothesis?"
            />
          </Grid>

          {/* Impact level */}
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.impact ? getRatingNumber(formData.impact) : 0}
              onRatingChange={(rating) => onFieldChange('impact', getRatingString(rating))}
              label="Impact Level"
              description="What is the potential impact on the system if the hypothesis proves false?"
            />
          </Grid>

          {/* Quality attributes */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Quality Attributes
            </Typography>
            <QualityAttributesField
              label="Quality Attributes (select one or more)"
              value={formData.qualityAttributes}
              onChange={(value) => onFieldChange('qualityAttributes', value)}
              options={QUALITY_ATTRIBUTE_OPTIONS}
              required
              helperText={
                formData.qualityAttributes.length === 0
                  ? 'Please select at least one quality attribute that this hypothesis affects. Click the field to open the list; each option shows a short concept in parentheses.'
                  : undefined
              }
            />
          </Grid>

          {/* Related artefacts */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Related Artefacts
            </Typography>
            <UrlListField
              label="Related Artefacts / Links"
              urls={formData.relatedArtefacts}
              onUrlsChange={(value) => onFieldChange('relatedArtefacts', value)}
              placeholder="https://example.com/artefact"
              helperText="No related artefacts or links added yet. Add links to relevant documentation, code repositories, or other resources."
            />
          </Grid>

          {/* Notes */}
          <Grid item xs={12}>
            <CustomTextField
              label="Notes/Comments"
              value={formData.notes}
              onChange={(value) => onFieldChange('notes', value)}
              rows={4}
              placeholder="Additional notes, comments, or observations about this hypothesis..."
            />
          </Grid>
        </Grid>

        {/* Submit button */}
        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
            className={classes.submitButton}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
          >
            {loading ? 'Submitting...' : title}
          </Button>
        </Box>
      </div>
    </Paper>
  );
};
