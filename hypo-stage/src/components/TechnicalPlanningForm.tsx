import { default as React } from 'react';
import { Typography, Button, Paper, CircularProgress, Grid, Box } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import Save from '@material-ui/icons/Save';
import { useStyles } from '../hooks/useStyles';
import { UrlListField } from './forms/UrlListField';
import { CreateTechnicalPlanningFormData } from '../hooks/forms/useCreateTechnicalPlanning';
import { EditTechnicalPlanningFormData } from '../hooks/forms/useEditTechnicalPlanning';
import { TechnicalPlanning } from '@archhypo/plugin-hypo-stage-backend';
import { ACTION_TYPE_OPTIONS } from '../utils/constants';
import { getRatingNumber, getRatingString } from '../utils/formatters';
import { CustomSelectField, CustomTextField } from './forms/FormField';
import { LikertScaleField } from './forms/LikertScaleField';

interface BaseTechnicalPlanningFormProps {
  isFormValid: boolean;
  loading: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
}

interface CreateTechnicalPlanningFormProps extends BaseTechnicalPlanningFormProps {
  mode: 'create';
  hypothesisId: string;
  availableEntityRefs: string[];
  formData: CreateTechnicalPlanningFormData;
  onFieldChange: (field: keyof CreateTechnicalPlanningFormData, value: any) => void;
}

interface EditTechnicalPlanningFormProps extends BaseTechnicalPlanningFormProps {
  mode: 'edit';
  technicalPlanning: TechnicalPlanning;
  formData: EditTechnicalPlanningFormData;
  onFieldChange: (field: keyof EditTechnicalPlanningFormData, value: any) => void;
}

export const TechnicalPlanningForm: React.FC<CreateTechnicalPlanningFormProps | EditTechnicalPlanningFormProps> = (props) => {
  const classes = useStyles();
  const { mode, formData, onFieldChange, isFormValid, loading, onSubmit, onCancel } = props;

  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const startIcon = isCreateMode ? <Add /> : <Save />;
  const title = isCreateMode ? 'Add Technical Planning' : 'Update Technical Planning';
  const subtitle = isCreateMode ? 'Define technical actions and planning for this hypothesis' : 'Update technical planning details';

  const handleSubmit = () => {
    onSubmit?.();
  };

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
          {isEditMode && (
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Planning ID
              </Typography>
              <Typography
                variant="body2"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: 2 }}
              >
                {props.technicalPlanning.id}
              </Typography>
            </Grid>
          )}
          {/* Entity reference */}
          <Grid item xs={12}>
            <CustomSelectField
              label="Owner"
              value={isCreateMode ? formData.entityRef : props.technicalPlanning.entityRef}
              onChange={isCreateMode ? (value) => onFieldChange('entityRef', value) : () => {}}
              options={isCreateMode ? props.availableEntityRefs.map((entityRef) => ({ value: entityRef, label: entityRef })) : [{value: props.technicalPlanning.entityRef, label: props.technicalPlanning.entityRef}]}
              required
              disabled={isEditMode}
            />
          </Grid>

          {/* Action type */}
          <Grid item xs={12} md={6}>
            <CustomSelectField
              label="Action Type"
              value={isCreateMode ? formData.actionType : props.technicalPlanning.actionType}
              onChange={isCreateMode ? (value) => onFieldChange('actionType', value) : () => {}}
              options={ACTION_TYPE_OPTIONS}
              required
              disabled={isEditMode}
            />
          </Grid>

          {/* Target date */}
          <Grid item xs={12} md={6}>
            <CustomTextField
              label="Target Date"
              value={isCreateMode ? formData.targetDate : new Date(props.technicalPlanning.targetDate).toISOString().split('T')[0]}
              onChange={isCreateMode ? (value) => onFieldChange('targetDate', value) : () => {}}
              required
              disabled={isEditMode}
              type="date"
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <CustomTextField
              label="Description"
              value={isCreateMode ? formData.description : props.technicalPlanning.description}
              onChange={isCreateMode ? (value) => onFieldChange('description', value) : () => {}}
              required
              disabled={isEditMode}
              rows={3}
              placeholder="Brief description of the technical action"
              helperText={`${isCreateMode ? formData.description.length : props.technicalPlanning.description.length}/500 characters`}
            />
          </Grid>

          {/* Expected outcome */}
          <Grid item xs={12}>
            <CustomTextField
              label="Expected Outcome"
              value={formData.expectedOutcome}
              onChange={(value) => onFieldChange('expectedOutcome', value)}
              required
              rows={3}
              placeholder="What do you expect to learn or achieve?"
              helperText={`${formData.expectedOutcome.length}/500 characters`}
            />
          </Grid>

          {/* Documentation links */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Documentation links (optional)
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph style={{ marginTop: 0 }}>
              Design docs, tickets, or other references are optional. You can create a plan without links and add or update them later from the technical planning edit form.
            </Typography>
            <UrlListField
              label="Documentation links"
              urls={formData.documentations}
              onUrlsChange={(value) => onFieldChange('documentations', value)}
              placeholder="https://example.com/docs"
              helperText="No links yet. Add valid URLs when you have them, or leave this empty and edit this planning item later."
            />
          </Grid>

          {/* Current uncertainty and impact */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Current Uncertainty & Impact
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              These are the current values. Change them if this technical planning affects them.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.uncertainty ? getRatingNumber(formData.uncertainty) : 0}
              onRatingChange={(rating) => onFieldChange('uncertainty', rating === 0 ? '' : getRatingString(rating))}
              label="Uncertainty Level"
              description="Change if this planning affects uncertainty"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <LikertScaleField
              rating={formData.impact ? getRatingNumber(formData.impact) : 0}
              onRatingChange={(rating) => onFieldChange('impact', rating === 0 ? '' : getRatingString(rating))}
              label="Impact Level"
              description="Change if this planning affects impact"
            />
          </Grid>
        </Grid>

        {/* Submit and Cancel buttons */}
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
          {onCancel && (
            <Button
              variant="outlined"
              size="large"
              onClick={onCancel}
              disabled={loading}
              className={classes.marginLeft}
            >
              Cancel
            </Button>
          )}
        </Box>
      </div>
    </Paper>
  );
};
