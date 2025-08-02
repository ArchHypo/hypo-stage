import {
  Typography,
  TextField,
  Button,
  Paper,
  Snackbar,
  CircularProgress
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Add from '@material-ui/icons/Add';
import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';
import { StarRating } from './StartRating';
import { EntityRefSelect } from './EntityRefSelect';

interface CreateHypothesisProps {
  onHypothesisCreated?: () => void;
}

export const CreateHypothesis = ({ onHypothesisCreated }: CreateHypothesisProps) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);

  const [entityRef, setEntityRef] = useState('');
  const [text, setText] = useState('');
  const [uncertaintyRating, setUncertaintyRating] = useState(0);
  const [impactRating, setImpactRating] = useState(0);
  const [technicalPlanning, setTechnicalPlanning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = entityRef && text.trim().length > 0 && uncertaintyRating > 0 && impactRating > 0 && technicalPlanning.trim().length > 0;

  // Convert numeric ratings to FiveStarRating
  const getRatingText = (rating: number): 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' => {
    switch (rating) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Very High';
      default: throw new Error('Invalid rating');
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setShowError(false);
    setErrorMessage('');

    try {
      const hypothesisData = {
        entityRef,
        text: text.trim(),
        uncertainty: getRatingText(uncertaintyRating),
        impact: getRatingText(impactRating),
        technicalPlanning: technicalPlanning.trim(),
      };

      await api.createHypothesis(hypothesisData);

      // Reset form
      setEntityRef('');
      setText('');
      setUncertaintyRating(0);
      setImpactRating(0);
      setTechnicalPlanning('');

      // Show success message
      setShowSuccess(true);

      // Notify parent component that a hypothesis was created
      onHypothesisCreated?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create hypothesis');
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
          Create New Hypothesis
        </Typography>
        <Typography className={classes.formSubtitle}>
          Define your hypothesis and assess its uncertainty and potential impact
        </Typography>

        <EntityRefSelect
            value={entityRef}
            onChange={setEntityRef}
            label="Owner/Team"
            required
            className={classes.inputField}
          />

        <div className={classes.formGrid}>
          <div className={classes.fullWidth}>
            <TextField
              label="What is your hypothesis?"
              variant="outlined"
              value={text}
              onChange={(e) => setText(e.target.value)}
              fullWidth
              required
              multiline
              placeholder="e.g., Implementing dark mode will increase user engagement by 15%"
              className={classes.inputField}
              helperText={`${text.length}/500 characters`}
            />
            {text.length > 0 && text.length < 20 && (
              <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                ⚠️ Please provide a more detailed hypothesis (at least 20 characters)
              </Typography>
            )}
            {text.length >= 20 && (
              <Typography className={`${classes.validationMessage} ${classes.validationSuccess}`}>
                ✅ Great! Your hypothesis is well-defined
              </Typography>
            )}
          </div>

          <div className={classes.fullWidth}>
            <StarRating
              rating={uncertaintyRating}
              onRatingChange={setUncertaintyRating}
              label="Uncertainty Level"
              description="How confident are you about this hypothesis? Higher uncertainty means more research/testing needed."
            />
          </div>

          <div className={classes.fullWidth}>
            <StarRating
              rating={impactRating}
              onRatingChange={setImpactRating}
              label="Potential Impact"
              description="How significant would the impact be if this hypothesis is correct? Consider business value and user benefit."
            />
          </div>

          <div className={classes.fullWidth}>
            <TextField
              label="Technical Planning Link"
              variant="outlined"
              value={technicalPlanning}
              onChange={(e) => setTechnicalPlanning(e.target.value)}
              fullWidth
              required
              placeholder="e.g., https://example.com/docs/technical-planning"
              className={classes.inputField}
              helperText="Link to technical documentation, design docs, or planning materials"
            />
            {technicalPlanning.length > 0 && !technicalPlanning.startsWith('http') && (
              <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                ⚠️ Please provide a valid URL starting with http:// or https://
              </Typography>
            )}
            {technicalPlanning.length > 0 && technicalPlanning.startsWith('http') && (
              <Typography className={`${classes.validationMessage} ${classes.validationSuccess}`}>
                ✅ Valid technical planning link provided
              </Typography>
            )}
          </div>

          <div className={classes.fullWidth}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={classes.submitButton}
              size="large"
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Hypothesis'}
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
          Hypothesis submitted successfully! 🎉
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
