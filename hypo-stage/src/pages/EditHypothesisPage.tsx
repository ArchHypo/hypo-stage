import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Grid,
  Box
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Save from '@material-ui/icons/Save';
import Delete from '@material-ui/icons/Delete';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ArrowBack from '@material-ui/icons/ArrowBack';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';
import { LikertScale } from '../components/LikertScale';
import { EntityRefSelect } from '../components/EntityRefSelect';
import {
  UpdateHypothesisInput,
  SourceType,
  QualityAttribute,
  LikertScale as LikertScaleType,
  ActionType,
  Hypothesis,
  Status
} from '@internal/plugin-hypo-stage-backend';
import {
  Header,
  Page,
  Content,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';

export const EditHypothesisPage = () => {
  const classes = useStyles();
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const navigate = useNavigate();
  const api = useApi(HypoStageApiRef);

  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [hypothesisError, setHypothesisError] = useState<Error | null>(null);

  // Form state
  const [status, setStatus] = useState<Status | ''>('');
  const [entityRef, setEntityRef] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [relatedArtefacts, setRelatedArtefacts] = useState<string[]>([]);
  const [newArtefact, setNewArtefact] = useState('');
  const [qualityAttributes, setQualityAttributes] = useState<QualityAttribute[]>([]);
  const [uncertainty, setUncertainty] = useState<LikertScaleType | ''>('');
  const [impact, setImpact] = useState<LikertScaleType | ''>('');

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

  // Helper functions to convert between LikertScale strings and numbers
  const getRatingNumber = (rating: LikertScaleType | ''): number => {
    switch (rating) {
      case 'Very Low': return 1;
      case 'Low': return 2;
      case 'Medium': return 3;
      case 'High': return 4;
      case 'Very High': return 5;
      default: return 0;
    }
  };

  const getRatingString = (rating: number): LikertScaleType => {
    switch (rating) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Very High';
      default: return 'Medium';
    }
  };

  // Load hypothesis data
  useEffect(() => {
    const fetchHypothesis = async () => {
      try {
        setLoading(true);
        const hypotheses = await api.getHypotheses();
        const found = hypotheses.find(h => h.id === hypothesisId);
        if (found) {
          setHypothesis(found);
          // Populate form with existing data
          setStatus(found.status);
          setEntityRef(found.technicalPlanning?.entityRef || '');
          setSourceType(found.sourceType);
          setRelatedArtefacts(found.relatedArtefacts);
          setQualityAttributes(found.qualityAttributes);
          setUncertainty(found.uncertainty);
          setImpact(found.impact);
          if (found.technicalPlanning) {
            setTechPlanActionType(found.technicalPlanning.actionType);
            setTechPlanDescription(found.technicalPlanning.description);
            setTechPlanExpectedOutcome(found.technicalPlanning.expectedOutcome);
            setTechPlanDocumentation(found.technicalPlanning.documentation);
            setTechPlanTargetDate(found.technicalPlanning.targetDate);
          }
          setNotes(found.notes || '');
        } else {
          setHypothesisError(new Error('Hypothesis not found'));
        }
      } catch (err) {
        setHypothesisError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (hypothesisId) {
      fetchHypothesis();
    }
  }, [hypothesisId, api]);

  const isFormValid = status &&
    entityRef &&
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
      const hypothesisData: UpdateHypothesisInput = {
        status: status as Status,
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

      await api.updateHypothesis(hypothesisId, hypothesisData);

      // Show success message
      setShowSuccess(true);

      // Navigate back to hypothesis page after a short delay
      setTimeout(() => {
        navigate(`/hypo-stage/hypothesis/${hypothesisId}`);
      }, 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update hypothesis');
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Progress />;
  }

  if (hypothesisError || !hypothesis) {
    return <ResponseErrorPanel error={hypothesisError || new Error('Hypothesis not found')} />;
  }

  return (
    <Page themeId="tool">
      <Header title="Edit Hypothesis" subtitle={`ID: ${hypothesis.id}`}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/hypo-stage/hypothesis/${hypothesisId}`)}
        >
          Back to Hypothesis
        </Button>
      </Header>

      <Content>
        <Paper className={classes.formContainer} elevation={0}>
          <Typography className={classes.formTitle}>
            <Save />
            Edit Hypothesis
          </Typography>
          <Typography className={classes.formSubtitle}>
            Update your hypothesis and reassess its uncertainty and potential impact
          </Typography>

          <Grid container spacing={3}>
            {/* Hypothesis Statement (Read-only) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hypothesis Statement"
                value={hypothesis.statement}
                multiline
                rows={4}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Statement cannot be edited (read-only)"
              />
            </Grid>

            {/* Entity Reference - Full width */}
            <Grid item xs={12}>
              <EntityRefSelect
                value={entityRef}
                onChange={setEntityRef}
                label="Entity Reference"
                required
              />
            </Grid>

            {/* Status and Source Type - Side by side */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  label="Status"
                >
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Review">In Review</MenuItem>
                  <MenuItem value="Validated">Validated</MenuItem>
                  <MenuItem value="Discarded">Discarded</MenuItem>
                  <MenuItem value="Trigger-Fired">Trigger-Fired</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" required>
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
            </Grid>

            {/* Uncertainty and Impact - Side by side */}
            <Grid item xs={12} md={6}>
              <LikertScale
                label="Uncertainty"
                rating={getRatingNumber(uncertainty)}
                onRatingChange={(rating) => setUncertainty(getRatingString(rating))}
                description="Rate the level of uncertainty about this hypothesis"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LikertScale
                label="Impact"
                rating={getRatingNumber(impact)}
                onRatingChange={(rating) => setImpact(getRatingString(rating))}
                description="Rate the potential impact of this hypothesis"
              />
            </Grid>

            {/* Quality Attributes */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Quality Attributes</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div style={{ width: '100%' }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Select the quality attributes that this hypothesis addresses
                    </Typography>
                                          <FormControl fullWidth variant="outlined">
                        <InputLabel>Quality Attributes</InputLabel>
                        <Select
                          multiple
                          value={qualityAttributes}
                          onChange={(e) => setQualityAttributes(e.target.value as QualityAttribute[])}
                          label="Quality Attributes"
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
                  </div>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Related Artefacts */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Related Artefacts</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <div style={{ width: '100%' }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Add URLs to related documents, code, or other artefacts
                    </Typography>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TextField
                        fullWidth
                        label="Artefact URL"
                        value={newArtefact}
                        onChange={(e) => setNewArtefact(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="https://example.com/document"
                        variant="outlined"
                        style={{ marginRight: 8 }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddArtefact}
                        disabled={!isArtefactValid(newArtefact)}
                      >
                        Add
                      </Button>
                    </Box>
                    {relatedArtefacts.length > 0 && (
                      <List dense>
                        {relatedArtefacts.map((artefact, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={artefact}
                              secondary={
                                <a href={artefact} target="_blank" rel="noopener noreferrer">
                                  Open Link
                                </a>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveArtefact(index)}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </div>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Technical Planning */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Technical Planning</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth variant="outlined" required>
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

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Target Date"
                        type="date"
                        value={techPlanTargetDate}
                        onChange={(e) => setTechPlanTargetDate(e.target.value)}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={techPlanDescription}
                        onChange={(e) => setTechPlanDescription(e.target.value)}
                        multiline
                        rows={3}
                        variant="outlined"
                        helperText={`${techPlanDescription.length}/500 characters`}
                        error={techPlanDescription.trim().length > 500}
                        required
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Expected Outcome"
                        value={techPlanExpectedOutcome}
                        onChange={(e) => setTechPlanExpectedOutcome(e.target.value)}
                        multiline
                        rows={3}
                        variant="outlined"
                        helperText={`${techPlanExpectedOutcome.length}/500 characters`}
                        error={techPlanExpectedOutcome.trim().length > 500}
                        required
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Documentation URL"
                        value={techPlanDocumentation}
                        onChange={(e) => setTechPlanDocumentation(e.target.value)}
                        variant="outlined"
                        placeholder="https://example.com/docs"
                        required
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={4}
                variant="outlined"
                placeholder="Any additional context or notes about this hypothesis..."
              />
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Hypothesis'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={6000}
          onClose={() => setShowSuccess(false)}
        >
          <Alert onClose={() => setShowSuccess(false)} severity="success">
            Hypothesis updated successfully! Redirecting...
          </Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
        >
          <Alert onClose={() => setShowError(false)} severity="error">
            {errorMessage}
          </Alert>
        </Snackbar>
      </Content>
    </Page>
  );
};
