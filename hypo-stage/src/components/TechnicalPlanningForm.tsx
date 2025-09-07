import { Typography, Button, Paper, CircularProgress, Grid, TextField, Box, FormControl, InputLabel, Select, MenuItem } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import Save from '@material-ui/icons/Save';
import { useStyles } from '../hooks/useStyles';
import { EntityRefSelect } from './EntityRefSelect';
import { UrlListField } from './forms/UrlListField';
import { CreateTechnicalPlanningFormData } from '../hooks/forms/useCreateTechnicalPlanning';
import { EditTechnicalPlanningFormData } from '../hooks/forms/useEditTechnicalPlanning';
import { TechnicalPlanning, ActionType } from '@internal/plugin-hypo-stage-backend';
import { ACTION_TYPE_OPTIONS } from '../utils/constants';

interface BaseTechnicalPlanningFormProps {
  isFormValid: boolean;
  loading: boolean;
  onSubmit?: () => void;
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
  const { mode, formData, onFieldChange, isFormValid, loading, onSubmit } = props;

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
        <Grid container spacing={3}>
          {/* Entity Reference - only in create mode */}
          {isCreateMode && (
            <Grid item xs={12} md={6}>
              <EntityRefSelect
                value={formData.entityRef}
                onChange={(value) => onFieldChange('entityRef', value)}
                label="Owner"
                required
                availableEntityRefs={props.availableEntityRefs}
              />
            </Grid>
          )}

          {/* Entity Reference - read-only in edit mode */}
          {isEditMode && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Owner"
                value={props.technicalPlanning.entityRef}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Owner cannot be edited (read-only)"
              />
            </Grid>
          )}

          {/* Action Type - only in create mode */}
          {isCreateMode && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" required>
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={formData.actionType}
                  onChange={(e) => onFieldChange('actionType', e.target.value as ActionType | '')}
                  label="Action Type"
                >
                  {ACTION_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Action Type - read-only in edit mode */}
          {isEditMode && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Action Type"
                value={props.technicalPlanning.actionType}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Action type cannot be edited (read-only)"
              />
            </Grid>
          )}

          {/* Target Date - only in create mode */}
          {isCreateMode && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target Date"
                type="date"
                value={formData.targetDate}
                onChange={(e) => onFieldChange('targetDate', e.target.value)}
                required
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="Required: Target date for completion"
              />
            </Grid>
          )}

          {/* Target Date - read-only in edit mode */}
          {isEditMode && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target Date"
                value={new Date(props.technicalPlanning.targetDate).toLocaleDateString()}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Target date cannot be edited (read-only)"
              />
            </Grid>
          )}

          {/* Description - only in create mode */}
          {isCreateMode && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => onFieldChange('description', e.target.value)}
                required
                multiline
                minRows={3}
                variant="outlined"
                placeholder="Brief description of the technical action"
                helperText={`${formData.description.length}/500 characters`}
              />
            </Grid>
          )}

          {/* Description - read-only in edit mode */}
          {isEditMode && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={props.technicalPlanning.description}
                variant="outlined"
                multiline
                minRows={3}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Description cannot be edited (read-only)"
              />
            </Grid>
          )}

          {/* Expected Outcome - editable in both modes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Expected Outcome"
              value={formData.expectedOutcome}
              onChange={(e) => onFieldChange('expectedOutcome', e.target.value)}
              required
              multiline
              minRows={3}
              variant="outlined"
              placeholder="What do you expect to learn or achieve?"
              helperText={`${formData.expectedOutcome.length}/500 characters`}
            />
          </Grid>

          {/* Documentation Links - editable in both modes */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Documentation Links
            </Typography>
            <UrlListField
              label="Documentation Links"
              urls={formData.documentations}
              onUrlsChange={(value) => onFieldChange('documentations', value)}
              placeholder="https://example.com/docs"
              helperText="No documentation links added yet. Add links to relevant documentation, design docs, or planning materials."
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
