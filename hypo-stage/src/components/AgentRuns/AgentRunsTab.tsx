import { default as React, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import { Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  AgentRunStatus,
  AgentRunSummary,
  AgentRunsPage,
  HypoStageApiRef,
} from '../../api/HypoStageApi';
import { AgentRunDetails } from './AgentRunDetails';
import { formatDateTime, formatDuration, formatRelative, STATUS_COLORS } from './format';

const PAGE_SIZE = 25;
const HANDLER_LABELS: Record<string, string> = {
  pr_analysis: 'PR analysis',
  issue_triage: 'Issue triage',
  plan_sync: 'Plan issue sync',
  plan_comment: 'Plan issue comment',
};
const STATUSES: AgentRunStatus[] = ['running', 'completed', 'failed', 'skipped'];

interface AgentRunsTabProps {
  /** False when the module is installed but hypoStage.agents.enabled is off. */
  enabled?: boolean;
}

export const AgentRunsTab = ({ enabled = true }: AgentRunsTabProps) => {
  const api = useApi(HypoStageApiRef);
  const [repository, setRepository] = useState('');
  const [status, setStatus] = useState<AgentRunStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState<AgentRunsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statements, setStatements] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    api
      .getHypotheses()
      .then(hypotheses => setStatements(new Map(hypotheses.map(h => [h.id, h.statement]))))
      .catch(() => setStatements(new Map()));
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getAgentRuns({
        repository: repository || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        offset,
      })
      .then(result => {
        if (!cancelled) {
          setPage(result);
          setError(null);
        }
      })
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, repository, status, offset, reloadKey]);

  const changeFilter = useCallback((apply: () => void) => {
    apply();
    setOffset(0);
  }, []);

  const columns: TableColumn<AgentRunSummary>[] = useMemo(
    () => [
      {
        title: 'Started',
        field: 'startedAt',
        render: row => <span title={formatDateTime(row.startedAt)}>{formatRelative(row.startedAt)}</span>,
      },
      { title: 'Repository', field: 'repository' },
      {
        title: 'PR',
        field: 'prNumber',
        render: row =>
          row.prUrl ? (
            <Link href={row.prUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              #{row.prNumber}
            </Link>
          ) : (
            `#${row.prNumber}`
          ),
      },
      {
        title: 'Flow',
        field: 'handler',
        render: row => HANDLER_LABELS[row.handler ?? 'pr_analysis'] ?? row.handler,
      },
      { title: 'Trigger', field: 'triggerAction' },
      { title: 'Model', field: 'modelKey', render: row => `${row.modelKey} · ${row.provider}` },
      {
        title: 'Status',
        field: 'status',
        render: row => <Chip size="small" label={row.status} style={STATUS_COLORS[row.status]} />,
      },
      { title: 'Suggestions', field: 'suggestionCount' },
      { title: 'Duration', field: 'completedAt', render: row => formatDuration(row.startedAt, row.completedAt) },
    ],
    [],
  );

  const total = page?.total ?? 0;
  const items = page?.items ?? [];

  return (
    <Box>
      {!enabled && (
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            Agents are disabled in config (hypoStage.agents.enabled); showing past runs.
          </Typography>
        </Box>
      )}

      <Box display="flex" flexWrap="wrap" alignItems="flex-end" mb={2} style={{ gap: 16 }}>
        <FormControl style={{ minWidth: 240 }}>
          <InputLabel id="agent-runs-repository">Repository</InputLabel>
          <Select
            labelId="agent-runs-repository"
            value={repository}
            onChange={e => changeFilter(() => setRepository(e.target.value as string))}
          >
            <MenuItem value="">All repositories</MenuItem>
            {(page?.repositories ?? []).map(r => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl style={{ minWidth: 160 }}>
          <InputLabel id="agent-runs-status">Status</InputLabel>
          <Select
            labelId="agent-runs-status"
            value={status}
            onChange={e => changeFilter(() => setStatus(e.target.value as AgentRunStatus | ''))}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => setReloadKey(k => k + 1)}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Typography color="error" style={{ marginBottom: 16 }}>
          {error}
        </Typography>
      )}

      <Table<AgentRunSummary>
        title="Agent runs"
        isLoading={loading}
        options={{ search: false, paging: false, sorting: false, padding: 'dense', toolbar: true }}
        columns={columns}
        data={items}
        detailPanel={({ rowData }) => <AgentRunDetails runId={rowData.id} statements={statements} />}
        onRowClick={(_event, _row, togglePanel) => togglePanel?.()}
        emptyContent={
          <Box p={3}>
            <Typography variant="body2" color="textSecondary">
              No agent runs yet. Runs appear here after a configured repository sends a pull request webhook.
            </Typography>
          </Box>
        }
      />

      {total > PAGE_SIZE && (
        <Box display="flex" justifyContent="flex-end" alignItems="center" mt={1} style={{ gap: 8 }}>
          <Typography variant="body2">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </Typography>
          <Button size="small" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}>
            Previous
          </Button>
          <Button size="small" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(o => o + PAGE_SIZE)}>
            Next
          </Button>
        </Box>
      )}
    </Box>
  );
};
