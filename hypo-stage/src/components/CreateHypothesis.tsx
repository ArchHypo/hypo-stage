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
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Add from '@material-ui/icons/Add';
import Delete from '@material-ui/icons/Delete';
import ExpandMore from '@material-ui/icons/ExpandMore';
import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';
import { LikertScale } from './LikertScale';
import { EntityRefSelect } from './EntityRefSelect';
import {
  CreateHypothesisInput,
  SourceType,
  QualityAttribute,
  LikertScale as LikertScaleType,
  ActionType
} from '@internal/plugin-hypo-stage-backend';

interface CreateHypothesisProps {
  onHypothesisCreated?: () => void;
}

export const CreateHypothesis = ({ onHypothesisCreated }: CreateHypothesisProps) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);

  const [entityRef, setEntityRef] = useState('');
  const [statement, setStatement] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [relatedArtefacts, setRelatedArtefacts] = useState<string[]>([]);
  const [newArtefact, setNewArtefact] = useState('');
  const [qualityAttributes, setQualityAttributes] = useState<QualityAttribute[]>([]);
  const [uncertainty, setUncertainty] = useState<LikertScaleType | ''>('');
  const [impact, setImpact] = useState<LikertScaleType | ''>('');

  // Helper function to convert LikertScale string to number
  const getRatingNumber = (rating: LikertScaleType): number => {
    switch (rating) {
      case 'Very Low': return 1;
      case 'Low': return 2;
      case 'Medium': return 3;
      case 'High': return 4;
      case 'Very High': return 5;
      default: return 0;
    }
  };

  // Helper function to convert number to LikertScale string
  const getRatingString = (rating: number): LikertScaleType => {
    switch (rating) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Very High';
      default: throw new Error('Invalid rating');
    }
  };

  // Technical Planning sub-form state
  const [techPlanActionType, setTechPlanActionType] = useState<ActionType | ''>('');
  const [techPlanDescription, setTechPlanDescription] = useState('');
  const [techPlanExpectedOutcome, setTechPlanExpectedOutcome] = useState('');
  const [techPlanDocumentation, setTechPlanDocumentation] = useState('');
  const [techPlanTargetDate, setTechPlanTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFormValid = entityRef &&
    statement.trim().length >= 20 &&
    statement.trim().length <= 500 &&
    sourceType &&
    qualityAttributes.length > 0 &&
    uncertainty !== '' &&
    impact !== '' &&
    techPlanActionType &&
    techPlanDescription.trim().length > 0 &&
    techPlanDescription.trim().length <= 500 &&
    techPlanExpectedOutcome.trim().length > 0 &&
    techPlanExpectedOutcome.trim().length <= 500 &&
    techPlanDocumentation &&
    techPlanTargetDate;

  const isArtefactValid = (artefact: string): boolean => {
    return artefact.trim().length > 0 && artefact.trim().startsWith('http');
  };

  const handleAddArtefact = () => {
    if (newArtefact.trim() && !relatedArtefacts.includes(newArtefact.trim())) {
      setRelatedArtefacts([...relatedArtefacts, newArtefact.trim()]);
      setNewArtefact('');
    }
  };

  const handleRemoveArtefact = (index: number) => {
    setRelatedArtefacts(relatedArtefacts.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddArtefact();
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setShowError(false);
    setErrorMessage('');

    try {
      const hypothesisData: CreateHypothesisInput = {
        statement: statement.trim(),
        sourceType: sourceType as SourceType,
        relatedArtefacts,
        qualityAttributes,
        uncertainty: uncertainty as LikertScaleType,
        impact: impact as LikertScaleType,
        technicalPlanning: {
          entityRef,
          actionType: techPlanActionType as ActionType,
          description: techPlanDescription.trim(),
          expectedOutcome: techPlanExpectedOutcome.trim(),
          documentation: techPlanDocumentation.trim(),
          targetDate: techPlanTargetDate,
        },
        notes: notes.trim() || null,
      };

      await api.createHypothesis(hypothesisData);

      // Reset form
      setEntityRef('');
      setStatement('');
      setSourceType('');
      setRelatedArtefacts([]);
      setQualityAttributes([]);
      setUncertainty('');
      setImpact('');
      // Reset technical planning sub-form
      setTechPlanActionType('');
      setTechPlanDescription('');
      setTechPlanExpectedOutcome('');
      setTechPlanDocumentation('');
      setTechPlanTargetDate('');
      setNotes('');

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

        <div className={classes.formGrid}>
          {/* Hypothesis Statement */}
          <div className={classes.fullWidth}>
            <TextField
              variant="outlined"
              fullWidth
              required
              multiline
              minRows={4}
              label="Hypothesis Statement"
              placeholder="e.g., The current access control library is compatible with the organization's Single Sign-On protocol."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              helperText={`${statement.length}/500 characters`}
              className={classes.inputField}
            />
            {statement.length > 0 && statement.length < 20 && (
              <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                ⚠️ Please provide a more detailed hypothesis (at least 20 characters)
              </Typography>
            )}
            {statement.length > 500 && (
              <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                ⚠️ Hypothesis is too long (maximum 500 characters)
              </Typography>
            )}
          </div>

          {/* Source Type */}
          <div className={classes.fullWidth}>
            <FormControl variant="outlined" fullWidth required className={classes.inputField}>
              <InputLabel>Source Type</InputLabel>
              <Select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                label="Source Type"
              >
                <MenuItem value="Requirements">Requirements</MenuItem>
                <MenuItem value="Solution">Solution</MenuItem>
                <MenuItem value="Quality Attribute">Quality Attribute</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Related Artefacts / Links */}
          <div className={classes.fullWidth}>
            <Typography variant="subtitle1" style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '16px', fontWeight: 600 }}>
              Related Artefacts / Links
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              placeholder="https://example.com/artefact"
              value={newArtefact}
              onChange={(e) => setNewArtefact(e.target.value)}
              onKeyDown={handleKeyPress}
              className={classes.inputField}
              InputProps={{
                endAdornment: (
                  <Button
                    variant="outlined"
                    onClick={handleAddArtefact}
                    disabled={!newArtefact.trim() || relatedArtefacts.includes(newArtefact.trim())}
                    size="small"
                    style={{ margin: '8px' }}
                  >
                    Add Artefact
                  </Button>
                )
              }}
            />
            {relatedArtefacts.length > 0 && (
              <List dense>
                {relatedArtefacts.map((artefact, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={
                        <a href={artefact} target="_blank" rel="noopener noreferrer">
                          {artefact}
                        </a>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveArtefact(index)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            {relatedArtefacts.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No related artefacts or links added yet. Add links to relevant documentation, code repositories, or other resources.
              </Typography>
            )}
          </div>

          {/* Quality Attributes Affected */}
          <div className={classes.fullWidth}>
            <FormControl variant="outlined" fullWidth required className={classes.inputField}>
              <InputLabel>Quality Attributes Affected</InputLabel>
              <Select
                multiple
                value={qualityAttributes}
                onChange={(e) => setQualityAttributes(e.target.value as QualityAttribute[])}
                label="Quality Attribute Affected"
              >
                <MenuItem value="Performance">Performance</MenuItem>
                <MenuItem value="Reliability">Reliability</MenuItem>
                <MenuItem value="Availability">Availability</MenuItem>
                <MenuItem value="Scalability">Scalability</MenuItem>
                <MenuItem value="Security">Security</MenuItem>
                <MenuItem value="Maintainability">Maintainability</MenuItem>
                <MenuItem value="Modifiability">Modifiability</MenuItem>
                <MenuItem value="Usability">Usability</MenuItem>
                <MenuItem value="Testability">Testability</MenuItem>
                <MenuItem value="Deployability">Deployability</MenuItem>
                <MenuItem value="Configurability">Configurability</MenuItem>
                <MenuItem value="Recoverability">Recoverability</MenuItem>
                <MenuItem value="Flexibility">Flexibility</MenuItem>
                <MenuItem value="Interoperability">Interoperability</MenuItem>
                <MenuItem value="Reusability">Reusability</MenuItem>
                <MenuItem value="Extensibility">Extensibility</MenuItem>
                <MenuItem value="Observability">Observability</MenuItem>
                <MenuItem value="Auditability">Auditability</MenuItem>
              </Select>
            </FormControl>
            {qualityAttributes.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                Please select at least one quality attribute that this hypothesis affects.
              </Typography>
            )}
          </div>

          {/* Uncertainty Level */}
          <div className={classes.fullWidth}>
            <LikertScale
              rating={uncertainty ? getRatingNumber(uncertainty) : 0}
              onRatingChange={(rating) => setUncertainty(getRatingString(rating))}
              label="Uncertainty Level"
              description="How far is the team from validating/falsifying this hypothesis?"
            />
          </div>

          {/* Impact Level */}
          <div className={classes.fullWidth}>
            <LikertScale
              rating={impact ? getRatingNumber(impact) : 0}
              onRatingChange={(rating) => setImpact(getRatingString(rating))}
              label="Impact Level"
              description="What is the potential impact on the system if the hypothesis proves false?"
            />
          </div>

          {/* Technical Planning / Actions */}
          <div className={classes.fullWidth}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Technical Planning & Actions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Owner */}
                  <Grid item xs={12} md={6}>
                    <EntityRefSelect
                      value={entityRef}
                      onChange={setEntityRef}
                      label="Owner"
                      required
                      className={classes.inputField}
                    />
                  </Grid>

                  {/* Action Type */}
                  <Grid item xs={12} md={6}>
                    <FormControl variant="outlined" fullWidth required className={classes.inputField}>
                      <InputLabel>Action Type</InputLabel>
                      <Select
                        value={techPlanActionType}
                        onChange={(e) => setTechPlanActionType(e.target.value as ActionType)}
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
                      value={techPlanDescription}
                      onChange={(e) => setTechPlanDescription(e.target.value)}
                      helperText={`${techPlanDescription.length}/500 characters`}
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
                      value={techPlanTargetDate}
                      onChange={(e) => setTechPlanTargetDate(e.target.value)}
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
                      value={techPlanExpectedOutcome}
                      onChange={(e) => setTechPlanExpectedOutcome(e.target.value)}
                      helperText={`${techPlanExpectedOutcome.length}/500 characters`}
                      className={classes.inputField}
                    />
                  </Grid>

                  {/* Documentation Link */}
                  <Grid item xs={12}>
                    <TextField
                      variant="outlined"
                      fullWidth
                      required
                      label="Documentation Link"
                      placeholder="e.g., https://example.com/docs/technical-planning"
                      value={techPlanDocumentation}
                      onChange={(e) => setTechPlanDocumentation(e.target.value)}
                      helperText="Required: Link to technical documentation, design docs, or planning materials"
                      className={classes.inputField}
                    />
                    {techPlanDocumentation.length > 0 && !isArtefactValid(techPlanDocumentation) && (
                      <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                        ⚠️ Please provide a valid URL starting with http:// or https://
                      </Typography>
                    )}
                    {techPlanDocumentation.length > 0 && isArtefactValid(techPlanDocumentation) && (
                      <Typography className={`${classes.validationMessage} ${classes.validationSuccess}`}>
                        ✅ Valid documentation link provided
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </div>

          {/* Notes/Comments */}
          <div className={classes.fullWidth}>
            <TextField
              variant="outlined"
              fullWidth
              multiline
              minRows={4}
              label="Notes/Comments"
              placeholder="Additional notes, comments, or observations about this hypothesis..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              helperText="Optional: Add any additional context, observations, or comments"
              className={classes.inputField}
            />
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
