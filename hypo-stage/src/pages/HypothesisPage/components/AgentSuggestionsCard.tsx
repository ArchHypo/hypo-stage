import { default as React, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  List,
  ListItem,
  Typography,
} from '@material-ui/core';
import EmojiObjects from '@material-ui/icons/EmojiObjects';
import { useApi } from '@backstage/core-plugin-api';
import { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { AgentSuggestion, AgentSuggestionKind, HypoStageApiRef } from '../../../api/HypoStageApi';
import { useApplyAgentSuggestion } from '../../../hooks/useApplyAgentSuggestion';
import { useAgentsStatus } from '../../../hooks/useAgentsStatus';
import { PlanDesignerDialog } from '../../../components/planner/PlanDesignerDialog';
import { useNotifications } from '../../../providers/NotificationProvider';

const KIND_LABELS: Record<AgentSuggestionKind, string> = {
  link: 'Related artefact',
  reassessment: 'Reassessment',
  planning_progress: 'Planning progress',
  new_planning: 'New technical planning',
  status_change: 'Status change',
  rewrite: 'Statement rewrite',
  evidence_alert: 'Evidence alert',
};

/** "owner/repo#issue/12" and "owner/repo#pull/7" read better as "owner/repo#12". */
const formatRef = (ref: string | null) => (ref ?? '').replace(/#(issue|pull)\//, '#');

const COACH_GROUP = 'coach';

interface AgentSuggestionsCardProps {
  hypothesis: Hypothesis;
  className?: string;
  onReviewed?: () => Promise<void> | void;
}

const SuggestionDetails = ({
  suggestion,
  hypothesis,
}: {
  suggestion: AgentSuggestion;
  hypothesis: Hypothesis;
}) => {
  const planning = hypothesis.technicalPlannings.find(tp => tp.id === suggestion.technicalPlanningId);
  const planningLabel = planning ? `${planning.actionType}: ${planning.description}` : null;

  switch (suggestion.kind) {
    case 'link':
      return (
        <Typography variant="body2">
          Add this {suggestion.artifactRef?.includes('#issue/') ? 'issue' : 'pull request'} to the related artefacts.
        </Typography>
      );
    case 'reassessment':
      return (
        <>
          <Typography variant="body2">
            Uncertainty {suggestion.payload.previous.uncertainty} → {suggestion.payload.uncertainty}, impact{' '}
            {suggestion.payload.previous.impact} → {suggestion.payload.impact}
          </Typography>
          {planningLabel && (
            <Typography variant="caption" color="textSecondary">
              Recorded on planning {planningLabel}
            </Typography>
          )}
        </>
      );
    case 'planning_progress':
      return (
        <>
          <Typography variant="body2">
            {suggestion.payload.effect === 'completes' ? 'Completes' : 'Advances'} {planningLabel ?? 'a technical planning'}
          </Typography>
          {suggestion.payload.expectedOutcome && (
            <Typography variant="caption" color="textSecondary">
              New expected outcome: {suggestion.payload.expectedOutcome}
            </Typography>
          )}
        </>
      );
    case 'new_planning':
      return (
        <>
          <Typography variant="body2">
            {suggestion.payload.actionType}: {suggestion.payload.description}
          </Typography>
          <Typography variant="caption" color="textSecondary" component="div">
            Expected outcome: {suggestion.payload.expectedOutcome} · Target {suggestion.payload.targetDate} ·{' '}
            {suggestion.payload.entityRef}
          </Typography>
          {suggestion.payload.uncertainty && suggestion.payload.previous && (
            <Typography variant="caption" color="textSecondary" component="div">
              Uncertainty {suggestion.payload.previous.uncertainty} → {suggestion.payload.uncertainty}, impact{' '}
              {suggestion.payload.previous.impact} → {suggestion.payload.impact}
            </Typography>
          )}
        </>
      );
    case 'rewrite':
      return (
        <>
          <Typography variant="body2" color="textSecondary">
            Current: {suggestion.payload.previous}
          </Typography>
          <Typography variant="body2">Proposed: {suggestion.payload.statement}</Typography>
          {(suggestion.payload.sourceType || suggestion.payload.addQualityAttributes.length > 0) && (
            <Typography variant="caption" color="textSecondary" component="div">
              {suggestion.payload.sourceType && `Source type → ${suggestion.payload.sourceType}. `}
              {suggestion.payload.addQualityAttributes.length > 0 &&
                `Add quality attributes: ${suggestion.payload.addQualityAttributes.join(', ')}`}
            </Typography>
          )}
        </>
      );
    case 'evidence_alert':
      return (
        <>
          <Typography variant="body2">
            {suggestion.payload.issues.length} reported issues{' '}
            {suggestion.payload.evidenceType === 'contradicts'
              ? 'suggest this uncertainty is materializing'
              : 'are consistent with this hypothesis'}
            . The assessment stays with the team: consider it at the next review.
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} mt={0.5}>
            {suggestion.payload.issues.map(url => (
              <Link key={url} href={url} target="_blank" rel="noopener noreferrer" variant="caption">
                {url.replace(/^https:\/\/github\.com\//, '')}
              </Link>
            ))}
          </Box>
        </>
      );
    case 'status_change':
      return (
        <Typography variant="body2">
          Status {suggestion.payload.previous} → {suggestion.payload.status}
        </Typography>
      );
    default:
      return null;
  }
};

export const AgentSuggestionsCard: React.FC<AgentSuggestionsCardProps> = ({
  hypothesis,
  className,
  onReviewed,
}) => {
  const api = useApi(HypoStageApiRef);
  const { accept, reject } = useApplyAgentSuggestion();
  const agents = useAgentsStatus();
  const [showPlanDesigner, setShowPlanDesigner] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSuggestions(await api.getAgentSuggestions(hypothesis.id, 'pending'));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load agent suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [api, hypothesis.id, showError]);

  useEffect(() => {
    void load();
    // Reload only when the hypothesis changes, not after every refresh of its data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hypothesis.id]);

  const review = async (suggestion: AgentSuggestion, decision: 'accepted' | 'rejected') => {
    setBusyId(suggestion.id);
    try {
      let message = `Suggestion ${decision}`;
      if (decision === 'accepted') {
        const reviewed = await accept(hypothesis, suggestion);
        if (reviewed?.issueClose?.closed) {
          message += ` · plan issue #${reviewed.issueClose.number} closed`;
        } else if (reviewed?.issueClose && !reviewed.issueClose.closed) {
          message += ` · could not close plan issue #${reviewed.issueClose.number}`;
        }
      } else {
        await reject(suggestion);
      }
      showSuccess(message);
      await load();
      if (onReviewed) {
        await onReviewed();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to review suggestion');
    } finally {
      setBusyId(null);
    }
  };

  const byPullRequest = useMemo(() => {
    const groups = new Map<string, AgentSuggestion[]>();
    for (const s of suggestions) {
      const key = s.artifactUrl ?? COACH_GROUP;
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return Array.from(groups.entries());
  }, [suggestions]);

  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <EmojiObjects />
          Agent Suggestions
        </Typography>

        {loading && (
          <Typography variant="body2" color="textSecondary">
            Loading agent suggestions...
          </Typography>
        )}
        {!loading && byPullRequest.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No pending agent suggestions
          </Typography>
        )}

        {!loading &&
          byPullRequest.map(([url, items], index) => (
            <Box key={url} mt={index === 0 ? 0 : 2}>
              {index > 0 && <Divider style={{ marginBottom: 16 }} />}
              {url === COACH_GROUP ? (
                <Typography variant="subtitle2">Hypothesis coach</Typography>
              ) : (
                <Link href={url} target="_blank" rel="noopener noreferrer" variant="subtitle2">
                  {formatRef(items[0].artifactRef)}
                </Link>
              )}
              <List dense disablePadding>
                {items.map(suggestion => (
                  <ListItem key={suggestion.id} divider alignItems="flex-start" style={{ display: 'block' }}>
                    <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 8 }} mb={0.5}>
                      <Chip size="small" color="primary" label={KIND_LABELS[suggestion.kind]} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${Math.round(suggestion.confidence * 100)}% confidence`}
                      />
                    </Box>
                    <SuggestionDetails suggestion={suggestion} hypothesis={hypothesis} />
                    <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
                      {suggestion.rationale}
                    </Typography>
                    {(suggestion.sources ?? []).length > 1 && (
                      <Typography variant="caption" color="textSecondary" component="div">
                        Sources:{' '}
                        {suggestion.sources.map((source, i) => (
                          <React.Fragment key={source.url}>
                            {i > 0 && ', '}
                            <Link href={source.url} target="_blank" rel="noopener noreferrer">
                              {formatRef(source.artifactRef)}
                            </Link>
                          </React.Fragment>
                        ))}
                      </Typography>
                    )}
                    {suggestion.evidence.length > 0 && (
                      <Typography variant="caption" color="textSecondary" component="div">
                        Evidence: {suggestion.evidence.map(e => e.file).join(', ')}
                      </Typography>
                    )}
                    <Box display="flex" style={{ gap: 8 }} mt={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disabled={busyId !== null}
                        onClick={() => review(suggestion, 'accepted')}
                      >
                        {suggestion.kind === 'evidence_alert' ? 'Acknowledge' : 'Accept'}
                      </Button>
                      {suggestion.kind === 'status_change' &&
                        suggestion.payload.status === 'Trigger-Fired' &&
                        agents.planner.enabled && (
                          <Button size="small" onClick={() => setShowPlanDesigner(true)}>
                            Suggest plan with AI
                          </Button>
                        )}
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        disabled={busyId !== null}
                        onClick={() => review(suggestion, 'rejected')}
                      >
                        Reject
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
      </CardContent>
      {agents.planner.enabled && (
        <PlanDesignerDialog
          open={showPlanDesigner}
          hypothesis={hypothesis}
          onClose={() => setShowPlanDesigner(false)}
          onAdded={async () => {
            if (onReviewed) await onReviewed();
          }}
        />
      )}
    </Card>
  );
};
