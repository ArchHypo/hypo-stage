import { Typography, Button, Paper, CircularProgress, Grid } from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import { useStyles } from '../hooks/useStyles';
import { BasicPlanningFields } from './TechnicalPlanningForm/BasicPlanningFields';
import { DescriptionFields } from './TechnicalPlanningForm/DescriptionFields';
import { DocumentationSection } from './TechnicalPlanningForm/DocumentationSection';
import { useTechnicalPlanning } from '../hooks/forms/useTechnicalPlanning';

interface TechnicalPlanningFormProps {
  hypothesisId: string;
  availableEntityRefs: string[];
  onTechnicalPlanningCreated?: () => void;
}

export const TechnicalPlanningForm = ({
  hypothesisId,
  availableEntityRefs,
  onTechnicalPlanningCreated
}: TechnicalPlanningFormProps) => {
  const classes = useStyles();
  const { formData, updateField, loading, isFormValid, handleSubmit } = useTechnicalPlanning(
    hypothesisId
  );

  const onSubmit = () => {
    handleSubmit(onTechnicalPlanningCreated);
  };

  return (
    <Paper className={classes.formContainer} elevation={0}>
      <Typography className={classes.formTitle}>
        <Add />
        Add Technical Planning
      </Typography>
      <Typography className={classes.formSubtitle}>
        Define technical actions and planning for this hypothesis
      </Typography>

      <div className={classes.formGrid}>
        <Grid container spacing={2}>
          <BasicPlanningFields
            entityRef={formData.entityRef}
            onEntityRefChange={(value) => updateField('entityRef', value)}
            actionType={formData.actionType}
            onActionTypeChange={(value) => updateField('actionType', value)}
            targetDate={formData.targetDate}
            onTargetDateChange={(value) => updateField('targetDate', value)}
            availableEntityRefs={availableEntityRefs}
          />

          <DescriptionFields
            description={formData.description}
            onDescriptionChange={(value) => updateField('description', value)}
            expectedOutcome={formData.expectedOutcome}
            onExpectedOutcomeChange={(value) => updateField('expectedOutcome', value)}
          />

          <DocumentationSection
            documentations={formData.documentations}
            onDocumentationsChange={(value) => updateField('documentations', value)}
          />
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
            {loading ? 'Submitting...' : 'Add Technical Planning'}
          </Button>
        </div>
      </div>
    </Paper>
  );
};
