import {
  Typography,
  TextField,
  Button,
  Paper,
  Snackbar,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Box
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Save from '@material-ui/icons/Save';
import Cancel from '@material-ui/icons/Cancel';
import Delete from '@material-ui/icons/Delete';
import Add from '@material-ui/icons/Add';
import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';
import { TechnicalPlanning, UpdateTechnicalPlanningInput } from '@internal/plugin-hypo-stage-backend';

interface EditTechnicalPlanningFormProps {
  technicalPlanning: TechnicalPlanning;
  onSave: () => void;
  onCancel: () => void;
}

export const EditTechnicalPlanningForm = ({
  technicalPlanning,
  onSave,
  onCancel
}: EditTechnicalPlanningFormProps) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);

  const [expectedOutcome, setExpectedOutcome] = useState(technicalPlanning.expectedOutcome);
  const [documentations, setDocumentations] = useState<string[]>(technicalPlanning.documentations);
  const [newDocumentation, setNewDocumentation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = expectedOutcome.trim().length > 0 &&
    expectedOutcome.trim().length <= 500 &&
    documentations.length > 0;

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
      const updateData: UpdateTechnicalPlanningInput = {
        expectedOutcome: expectedOutcome.trim(),
        documentations,
      };

      await api.updateTechnicalPlanning(technicalPlanning.id, updateData);

      // Show success message
      setShowSuccess(true);

      // Notify parent component that technical planning was updated
      onSave();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update technical planning');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Paper className={classes.paperContainer}>
        <Typography variant="h6" gutterBottom>
          Edit Technical Planning
        </Typography>

        {/* Expected Outcome */}
        <TextField
          variant="outlined"
          fullWidth
          required
          multiline
          label="Expected Outcome"
          placeholder="What do you expect to learn or achieve?"
          value={expectedOutcome}
          onChange={(e) => setExpectedOutcome(e.target.value)}
          helperText={`${expectedOutcome.length}/500 characters`}
          className={`${classes.inputField} ${classes.inputFieldWithMargin}`}
        />

        {/* Documentations */}
        <Typography variant="subtitle1" className={classes.subtitle}>
          Documentation Links
        </Typography>
        <TextField
          variant="outlined"
          fullWidth
          placeholder="https://example.com/docs"
          value={newDocumentation}
          onChange={(e) => setNewDocumentation(e.target.value)}
          onKeyDown={handleKeyPress}
          className={`${classes.inputField} ${classes.inputFieldWithMargin}`}
          InputProps={{
            endAdornment: (
              <Button
                variant="outlined"
                onClick={handleAddDocumentation}
                disabled={!newDocumentation.trim() || documentations.includes(newDocumentation.trim())}
                size="small"
                className={classes.iconButton}
              >
                <Add />
                Add Link
              </Button>
            )
          }}
        />

        {documentations.length > 0 && (
          <List dense className={classes.denseListBottom}>
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
          <Typography variant="body2" color="textSecondary" className={classes.marginBottom}>
            No documentation links added yet. Add links to relevant documentation, design docs, or planning materials.
          </Typography>
        )}

        {/* Action Buttons */}
        <Box display="flex">
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
            className={classes.secondaryButton}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={isSubmitting}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          Technical planning updated successfully! 🎉
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
