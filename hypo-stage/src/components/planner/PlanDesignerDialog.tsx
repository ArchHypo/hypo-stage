import { default as React, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import {
  HypoStageApiRef,
  PlanActionDecision,
  PlanGoal,
  PlannedAction,
  PlanProposal,
  PlanStrategyProfile,
} from '../../api/HypoStageApi';
import { useNotifications } from '../../providers/NotificationProvider';

export const GOAL_LABELS: Record<PlanGoal, string> = {
  accept_or_refute: 'Accept or refute',
  reduce_uncertainty: 'Reduce uncertainty',
  reduce_impact: 'Reduce impact',
  define_postponement_criteria: 'Define postponement criteria',
};

const PROFILE_LABELS: Record<PlanStrategyProfile, string> = {
  act_now: 'Act in the first iteration',
  investigate: 'Investigate early',
  postpone_with_criteria: 'Postpone with criteria',
  reduce_impact: 'Reduce the impact',
  monitor: 'Monitor',
  balanced: 'Balance uncertainty and impact',
};

interface PlanDesignerDialogProps {
  open: boolean;
  hypothesis: Hypothesis;
  onClose: () => void;
  /** Called after an action was created as a technical planning. */
  onAdded: () => Promise<void> | void;
  /** Opens the create form pre-filled with this action; hidden when not provided. */
  onEditBeforeAdding?: (action: PlannedAction, proposalId: string, index: number) => void;
}

export const PlanDesignerDialog = ({
  open,
  hypothesis,
  onClose,
  onAdded,
  onEditBeforeAdding,
}: PlanDesignerDialogProps) => {
  const api = useApi(HypoStageApiRef);
  const { showSuccess, showError } = useNotifications();
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<number, PlanActionDecision>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDecisions({});
    try {
      setProposal(await api.proposeTechnicalPlan(hypothesis.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The plan designer failed');
    } finally {
      setLoading(false);
    }
  }, [api, hypothesis.id]);

  useEffect(() => {
    if (open && !proposal && !loading && !error) {
      void generate();
    }
  }, [open, proposal, loading, error, generate]);

  const record = async (index: number, decision: PlanActionDecision, technicalPlanningId?: string) => {
    setDecisions(d => ({ ...d, [index]: decision }));
    try {
      await api.decidePlanAction(proposal!.proposalId, index, decision, technicalPlanningId);
    } catch {
      // The decision log is only used for statistics; never block the user on it.
    }
  };

  const add = async (action: PlannedAction, index: number) => {
    setBusyIndex(index);
    try {
      const created = await api.createTechnicalPlanning(hypothesis.id, {
        entityRef: action.entityRef,
        actionType: action.actionType,
        description: action.description,
        expectedOutcome: action.expectedOutcome,
        documentations: [],
        targetDate: action.targetDate,
      });
      await record(index, 'added', created?.id);
      showSuccess('Technical planning added');
      await onAdded();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to add the technical planning');
    } finally {
      setBusyIndex(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby="plan-designer-title">
      <DialogTitle id="plan-designer-title">Suggested technical plan</DialogTitle>
      <DialogContent>
        {loading && (
          <Box display="flex" alignItems="center" style={{ gap: 12 }} py={2}>
            <CircularProgress size={20} />
            <Typography variant="body2">Designing a plan…</Typography>
          </Box>
        )}

        {error && !loading && (
          <Box py={2}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
            <Button size="small" onClick={generate} style={{ marginTop: 8 }}>
              Try again
            </Button>
          </Box>
        )}

        {proposal && !loading && (
          <>
            <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 8 }} mb={1}>
              <Chip
                color="primary"
                label={`Uncertainty ${hypothesis.uncertainty} · Impact ${hypothesis.impact} → ${PROFILE_LABELS[proposal.profile]}`}
              />
            </Box>
            <Typography variant="body2" paragraph>
              {proposal.reading}
            </Typography>
            {proposal.warnings.map((warning, i) => (
              <Typography key={i} variant="body2" style={{ color: '#e65100' }} paragraph>
                ⚠ {warning}
              </Typography>
            ))}

            {proposal.actions.map((action, index) => {
              const decision = decisions[index];
              return (
                <Card key={index} variant="outlined" style={{ marginBottom: 12, opacity: decision ? 0.6 : 1 }}>
                  <CardContent>
                    <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} mb={1}>
                      <Chip size="small" color="primary" label={action.actionType} />
                      <Chip size="small" variant="outlined" label={GOAL_LABELS[action.goal]} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Iteration ${action.iteration} · ${action.targetDate}`}
                      />
                      <Chip size="small" variant="outlined" label={action.entityRef} />
                    </Box>
                    <Typography variant="body1">{action.description}</Typography>
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                      Expected outcome: {action.expectedOutcome}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" component="div" style={{ marginTop: 4 }}>
                      Why: {action.rationale}
                    </Typography>
                    <Box display="flex" style={{ gap: 8 }} mt={1.5}>
                      {decision ? (
                        <Typography variant="body2">
                          {decision === 'dismissed' ? 'Dismissed' : 'Added to the plan'}
                        </Typography>
                      ) : (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            disabled={busyIndex !== null}
                            onClick={() => add(action, index)}
                          >
                            Add
                          </Button>
                          {onEditBeforeAdding && (
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={busyIndex !== null}
                              onClick={() => onEditBeforeAdding(action, proposal.proposalId, index)}
                            >
                              Edit before adding
                            </Button>
                          )}
                          <Button
                            size="small"
                            disabled={busyIndex !== null}
                            onClick={() => record(index, 'dismissed')}
                          >
                            Dismiss
                          </Button>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {proposal && !loading && <Button onClick={generate}>Generate again</Button>}
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
