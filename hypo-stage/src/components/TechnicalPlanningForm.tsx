import {
  Typography,
  TextField,
  Button,
  Paper,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Add from '@material-ui/icons/Add';
import Delete from '@material-ui/icons/Delete';
import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';
import { EntityRefSelect } from './EntityRefSelect';
import {
  CreateTechnicalPlanningInput,
  ActionType
} from '@internal/plugin-hypo-stage-backend';

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
  const api = useApi(HypoStageApiRef);

  const [entityRef, setEntityRef] = useState('');
  const [actionType, setActionType] = useState<ActionType | ''>('');
  const [description, setDescription] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [documentations, setDocumentations] = useState<string[]>([]);
  const [newDocumentation, setNewDocumentation] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = entityRef &&
    actionType &&
    description.trim().length > 0 &&
    description.trim().length <= 500 &&
    expectedOutcome.trim().length > 0 &&
    expectedOutcome.trim().length <= 500 &&
    documentations.length > 0 &&
    targetDate;



  const handleAddDocumentation = () => {
    if (newDocumentation.trim() && !documentations.includes(newDocumentation.trim())) {
      setDocumentations([...documentations, newDocumentation.trim()]);
      setNewDocumentation('');
    }
  };

  const handleRemoveDocumentation = (index: number) => {
    setDocumentations(documentations.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDocumentation();
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setShowError(false);
    setErrorMessage('');

    try {
      const technicalPlanningData: CreateTechnicalPlanningInput = {
        entityRef,
        actionType: actionType as ActionType,
        description: description.trim(),
        expectedOutcome: expectedOutcome.trim(),
        documentations,
        targetDate,
      };

      await api.createTechnicalPlanning(hypothesisId, technicalPlanningData);

      // Reset form
      setEntityRef('');
      setActionType('');
      setDescription('');
      setExpectedOutcome('');
      setDocumentations([]);
      setNewDocumentation('');
      setTargetDate('');

      // Show success message
      setShowSuccess(true);

      // Notify parent component that technical planning was created
      onTechnicalPlanningCreated?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create technical planning');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
            {/* Owner */}
            <Grid item xs={12} md={6}>
              <EntityRefSelect
                value={entityRef}
                onChange={setEntityRef}
                label="Owner"
                required
                className={classes.inputField}
                availableEntityRefs={availableEntityRefs}
              />
            </Grid>

            {/* Action Type */}
            <Grid item xs={12} md={6}>
              <FormControl variant="outlined" fullWidth required className={classes.inputField}>
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionType)}
                  label="Action Type"
                >
                  <MenuItem value="Experiment">Experiment</MenuItem>
                  <MenuItem value="Analytics">Analytics</MenuItem>
                  <MenuItem value="Spike">Spike</MenuItem>
                  <MenuItem value="Tracer Bullet">Tracer Bullet</MenuItem>
                  <MenuItem value="Modularization">Modularization</MenuItem>
                  <MenuItem value="Trigger">Trigger</MenuItem>
                  <MenuItem value="Guideline">Guideline</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                fullWidth
                required
                multiline
                label="Description"
                placeholder="Brief description of the technical action"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                helperText={`${description.length}/500 characters`}
                className={classes.inputField}
              />
            </Grid>

            {/* Target Date */}
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                fullWidth
                type="date"
                label="Target Iteration/Sprint"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                helperText="Required: Target date for completion"
                className={classes.inputField}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Expected Outcome */}
            <Grid item xs={12} md={6}>
              <TextField
                variant="outlined"
                fullWidth
                required
                label="Expected Outcome"
                placeholder="What do you expect to learn or achieve?"
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                helperText={`${expectedOutcome.length}/500 characters`}
                className={classes.inputField}
              />
            </Grid>

            {/* Documentation Links */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px', fontWeight: 600 }}>
                Documentation Links (Multiple)
              </Typography>
              <TextField
                variant="outlined"
                fullWidth
                placeholder="https://example.com/docs"
                value={newDocumentation}
                onChange={(e) => setNewDocumentation(e.target.value)}
                onKeyDown={handleKeyPress}
                className={classes.inputField}
                InputProps={{
                  endAdornment: (
                    <Button
                      variant="outlined"
                      onClick={handleAddDocumentation}
                      disabled={!newDocumentation.trim() || documentations.includes(newDocumentation.trim())}
                      size="small"
                      style={{ margin: '8px' }}
                    >
                      Add Link
                    </Button>
                  )
                }}
              />
              {documentations.length > 0 && (
                <List dense style={{ marginTop: 16 }}>
                  {documentations.map((doc, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={
                          <a href={doc} target="_blank" rel="noopener noreferrer">
                            {doc}
                          </a>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveDocumentation(index)}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
              {documentations.length === 0 && (
                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                  No documentation links added yet. Add links to relevant documentation, design docs, or planning materials.
                </Typography>
              )}
            </Grid>
          </Grid>

          <div className={classes.fullWidth}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={classes.submitButton}
              size="large"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Submitting...' : 'Add Technical Planning'}
            </Button>
          </div>
        </div>
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          Technical planning added successfully! 🎉
        </Alert>
      </Snackbar>

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowError(false)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
