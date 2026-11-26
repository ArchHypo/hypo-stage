import { default as React, useState } from 'react';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import { useApi } from '@backstage/core-plugin-api';
import { TechnicalPlanning } from '@archhypo/plugin-hypo-stage-backend';
import { HypoStageApiRef, PlanningIssueLink, RepositoryChoiceRequiredError } from '../../api/HypoStageApi';
import { useNotifications } from '../../providers/NotificationProvider';

interface PlanIssueControlProps {
  technicalPlanning: TechnicalPlanning;
  link: PlanningIssueLink | null;
  onOpened: () => Promise<void> | void;
}

function linkLabel(link: PlanningIssueLink): string {
  if (link.state === 'open') return `#${link.issueNumber} · open`;
  if (link.stateReason === 'not_planned') return `#${link.issueNumber} · not planned`;
  return `#${link.issueNumber} · completed`;
}

/**
 * Opens a technical planning as a GitHub issue (plan tasks in the
 * team's backlog), or shows the linked issue and its state.
 */
export const PlanIssueControl = ({ technicalPlanning, link, onOpened }: PlanIssueControlProps) => {
  const api = useApi(HypoStageApiRef);
  const { showSuccess, showError } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [repository, setRepository] = useState('');

  if (link) {
    return (
      <Chip
        size="small"
        icon={<GitHubIcon fontSize="small" />}
        label={linkLabel(link)}
        component="a"
        href={link.issueUrl}
        target="_blank"
        rel="noopener noreferrer"
        clickable
        variant="outlined"
      />
    );
  }

  const open = async (chosen?: string) => {
    setBusy(true);
    try {
      const created = await api.openPlanningIssue(technicalPlanning.id, chosen);
      setChoices(null);
      if (!technicalPlanning.documentations.includes(created.issueUrl)) {
        await api.updateTechnicalPlanning(technicalPlanning.id, {
          expectedOutcome: technicalPlanning.expectedOutcome,
          documentations: [...technicalPlanning.documentations, created.issueUrl],
        });
      }
      showSuccess(`Opened issue #${created.issueNumber}`);
      await onOpened();
    } catch (err) {
      if (err instanceof RepositoryChoiceRequiredError) {
        setChoices(err.repositories);
        setRepository(err.repositories[0] ?? '');
      } else {
        showError(err instanceof Error ? err.message : 'Failed to open the issue');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={busy ? <CircularProgress size={14} /> : <GitHubIcon />}
        disabled={busy}
        onClick={() => open()}
      >
        Open as issue
      </Button>
      <Dialog open={choices !== null} onClose={() => setChoices(null)} aria-labelledby="plan-issue-repo-title">
        <DialogTitle id="plan-issue-repo-title">Where should the issue be opened?</DialogTitle>
        <DialogContent>
          {choices && choices.length > 0 ? (
            <TextField
              select
              fullWidth
              label="Repository"
              value={repository}
              onChange={e => setRepository(e.target.value)}
            >
              {choices.map(r => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            'No repository allows plan issues (hypoStage.agents.repositories[].issues.planIssues).'
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoices(null)}>Cancel</Button>
          <Button color="primary" disabled={!repository || busy} onClick={() => open(repository)}>
            Open issue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
