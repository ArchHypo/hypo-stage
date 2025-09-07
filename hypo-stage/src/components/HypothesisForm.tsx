import { Typography, Button, Paper, CircularProgress, Grid, TextField, Box } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import { useStyles } from '../hooks/useStyles';
import { EntityRefMultiSelect } from './EntityRefSelect';
import { CustomSelectField } from './forms/FormField';
import { validateHypothesisStatement } from '../utils/validators';
import { QUALITY_ATTRIBUTE_OPTIONS, SOURCE_TYPE_OPTIONS, STATUS_OPTIONS } from '../utils/constants';
import { LikertScaleField } from './forms/LikertScaleField';
import { getRatingNumber, getRatingString } from '../utils/formatters';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';
import Save from '@material-ui/icons/Save';
import { CreateHypothesisFormData } from '../hooks/forms/useCreateHypothesis';
import { EditHypothesisFormData } from '../hooks/forms/useEditHypothesis';
import { UrlListField } from './forms/UrlListField';

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
        <Grid container spacing={3}>
          {/* Entity references - only in create mode */}
          {isCreateMode && (
            <Grid item xs={12}>
              <EntityRefMultiSelect
                value={formData.entityRefs}
                onChange={(value) => onFieldChange('entityRefs', value)}
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
          )}
          {/* Entity References - read-only in edit mode */}
          {isEditMode && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Entity References"
                value={props.hypothesis.entityRefs.join(', ')}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Entity references cannot be edited (read-only)"
              />
            </Grid>
          )}

          {/* Hypothesis statement - editable in create mode, read-only in edit mode */}
          <Grid item xs={12}>
            <TextField
                fullWidth
                label="Hypothesis Statement"
                value={isCreateMode ? formData.statement : props.hypothesis.statement}
                onChange={isCreateMode ? (e) => onFieldChange('statement', e.target.value) : undefined}
                required
                multiline
                minRows={4}
                variant="outlined"
                placeholder="e.g., The current access control library is compatible with the organization's Single Sign-On protocol."
                helperText={isCreateMode ? `${formData.statement.length}/500 characters` : undefined}
                InputProps={{
                  readOnly: isEditMode,
                }}
              />
              {isCreateMode && !statementValidation.isValid && formData.statement.length > 0 && (
                <Typography variant="body2" color="error" className={classes.validationMessage}>
                  ⚠️ {statementValidation.message}
                </Typography>
              )}
          </Grid>

          {/* Status - only in edit mode */}
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
            <CustomSelectField
              label="Quality Attributes"
              value={formData.qualityAttributes}
              onChange={(value) => onFieldChange('qualityAttributes', value)}
              options={QUALITY_ATTRIBUTE_OPTIONS}
              multiple
            />
            {formData.qualityAttributes.length === 0 && (
              <Typography variant="body2" color="textSecondary" className={classes.secondaryText}>
                Please select at least one quality attribute that this hypothesis affects.
              </Typography>
            )}
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
            <TextField
              fullWidth
              label="Notes/Comments"
              value={formData.notes}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              multiline
              minRows={4}
              variant="outlined"
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
