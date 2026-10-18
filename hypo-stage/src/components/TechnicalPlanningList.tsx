import { default as React, useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button
} from '@material-ui/core';
import Timeline from '@material-ui/icons/Timeline';
import EmojiObjects from '@material-ui/icons/EmojiObjects';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef, PlannedAction, PlanningIssueLink } from '../api/HypoStageApi';
import { useAgentsStatus } from '../hooks/useAgentsStatus';
import { PlanDesignerDialog } from './planner/PlanDesignerDialog';
import { useStyles } from '../hooks/useStyles';
import { TechnicalPlanningForm } from './TechnicalPlanningForm';
import { TechnicalPlanningItem } from './TechnicalPlanningItem';
import { useCreateTechnicalPlanning } from '../hooks/forms/useCreateTechnicalPlanning';
import { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';

interface TechnicalPlanningListProps {
  hypothesis: Hypothesis;
  onRefresh: () => Promise<void>;
}

export const TechnicalPlanningList: React.FC<TechnicalPlanningListProps> = ({
  hypothesis,
  onRefresh
}) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);
  const agents = useAgentsStatus();
  const { formData, updateField, updateFields, loading, isFormValid, handleSubmit } = useCreateTechnicalPlanning(
    hypothesis.id,
    hypothesis.uncertainty,
    hypothesis.impact,
  );
  const [showTechnicalPlanningForm, setShowTechnicalPlanningForm] = useState(false);
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null);
  const [showPlanDesigner, setShowPlanDesigner] = useState(false);
  // Proposal action being edited in the create form, recorded as "edited" once saved.
  const [editedProposalAction, setEditedProposalAction] = useState<{ proposalId: string; index: number } | null>(null);

  const [issueLinks, setIssueLinks] = useState<PlanningIssueLink[]>([]);
  const loadIssueLinks = useCallback(async () => {
    try {
      setIssueLinks(await api.getPlanningIssues(hypothesis.id));
    } catch {
      setIssueLinks([]);
    }
  }, [api, hypothesis.id]);
  useEffect(() => {
    if (agents.issues.planIssues) {
      void loadIssueLinks();
    }
  }, [agents.issues.planIssues, loadIssueLinks]);

  const suggestPlanButton = agents.planner.enabled ? (
    <Button
      variant="outlined"
      color="primary"
      startIcon={<EmojiObjects />}
      onClick={() => setShowPlanDesigner(true)}
      className={classes.marginTop}
      style={{ marginLeft: 8 }}
    >
      Suggest plan with AI
    </Button>
  ) : null;

  const editBeforeAdding = (action: PlannedAction, proposalId: string, index: number) => {
    updateFields({
      entityRef: action.entityRef,
      actionType: action.actionType,
      description: action.description,
      expectedOutcome: action.expectedOutcome,
      targetDate: action.targetDate,
    });
    setEditedProposalAction({ proposalId, index });
    setShowPlanDesigner(false);
    setShowTechnicalPlanningForm(true);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Timeline />
            Technical Planning
          </Typography>

          {hypothesis.technicalPlannings.length > 0 ? (
            <Grid container spacing={3}>
              {hypothesis.technicalPlannings.map((techPlan, index) => (
                <Grid item xs={12} key={techPlan.id}>
                  <TechnicalPlanningItem
                    technicalPlanning={techPlan}
                    hypothesis={hypothesis}
                    index={index}
                    onRefresh={onRefresh}
                    isEditing={editingPlanningId === techPlan.id}
                    onEditStart={() => setEditingPlanningId(techPlan.id)}
                    onEditEnd={() => setEditingPlanningId(null)}
                    planIssues={
                      agents.issues.planIssues
                        ? {
                            link: issueLinks.find(l => l.technicalPlanningId === techPlan.id) ?? null,
                            onOpened: async () => {
                              await loadIssueLinks();
                              await onRefresh();
                            },
                          }
                        : undefined
                    }
                  />
                </Grid>
              ))}

              {/* Add another technical planning button */}
              {!showTechnicalPlanningForm && (
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowTechnicalPlanningForm(true)}
                    className={classes.marginTop}
                  >
                    Add Another Technical Planning
                  </Button>
                  {suggestPlanButton}
                </Grid>
              )}
            </Grid>
          ) : (
            <Box>
              <Typography variant="body2" color="textSecondary" className={classes.marginBottom}>
                No technical planning information available
              </Typography>
              {!showTechnicalPlanningForm && (
                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowTechnicalPlanningForm(true)}
                  >
                    Add Technical Planning
                  </Button>
                  {suggestPlanButton}
                </Box>
              )}
            </Box>
          )}

          {showTechnicalPlanningForm && (
            <Box className={classes.marginTopLarge}>
              <TechnicalPlanningForm
                mode="create"
                hypothesisId={hypothesis.id}
                availableEntityRefs={hypothesis.entityRefs}
                formData={formData}
                onFieldChange={updateField}
                isFormValid={isFormValid}
                loading={loading}
                onSubmit={() => {
                  handleSubmit(async () => {
                    setShowTechnicalPlanningForm(false);
                    if (editedProposalAction) {
                      api
                        .decidePlanAction(editedProposalAction.proposalId, editedProposalAction.index, 'edited')
                        .catch(() => undefined);
                      setEditedProposalAction(null);
                    }
                    await onRefresh();
                  });
                }}
                onCancel={() => {
                  setShowTechnicalPlanningForm(false);
                  setEditedProposalAction(null);
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
      {agents.planner.enabled && (
        <PlanDesignerDialog
          open={showPlanDesigner}
          hypothesis={hypothesis}
          onClose={() => setShowPlanDesigner(false)}
          onAdded={onRefresh}
          onEditBeforeAdding={editBeforeAdding}
        />
      )}
    </>
  );
};
