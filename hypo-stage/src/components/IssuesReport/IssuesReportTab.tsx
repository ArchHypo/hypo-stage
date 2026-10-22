import { default as React, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useNavigate } from 'react-router-dom';
import { CoverageFinding, HypoStageApiRef, IssuesReport } from '../../api/HypoStageApi';

const HOUR = 3_600_000;
const PERIODS = [
  { key: '24h', ms: 24 * HOUR, label: 'Last 24 hours' },
  { key: '7d', ms: 7 * 24 * HOUR, label: 'Last 7 days' },
  { key: '30d', ms: 30 * 24 * HOUR, label: 'Last 30 days' },
  { key: '90d', ms: 90 * 24 * HOUR, label: 'Last 90 days' },
  { key: '365d', ms: 365 * 24 * HOUR, label: 'Last 12 months' },
];

const Tile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card variant="outlined">
    <CardContent>
      <Typography variant="caption" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
      {hint && (
        <Typography variant="caption" color="textSecondary">
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const CountTable = ({ title, counts, header }: { title: string; counts: Record<string, number>; header: string }) => {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Nothing in this period
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{header}</TableCell>
                <TableCell align="right">Issues</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell>{k}</TableCell>
                  <TableCell align="right">{v}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Maintenance report after ArchHypo: reported issues by type and quality
 * attribute, how many relate to hypotheses, resolution time, plan activities carried out as
 * issues, and recurring costly themes no hypothesis covers.
 */
export const IssuesReportTab = () => {
  const api = useApi(HypoStageApiRef);
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');
  const [report, setReport] = useState<IssuesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useCallback(() => {
    const to = new Date();
    const ms = PERIODS.find(p => p.key === period)?.ms ?? 30 * 24 * HOUR;
    return { from: new Date(to.getTime() - ms).toISOString(), to: to.toISOString() };
  }, [period]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await api.getIssuesReport(query()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the report');
    }
  }, [api, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadMarkdown = async () => {
    const markdown = await api.getIssuesReportMarkdown(query());
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `issues-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createHypothesis = async (finding: CoverageFinding) => {
    setBusyId(finding.id);
    try {
      await api.updateCoverageFinding(finding.id, 'created');
    } catch {
      // the finding status is bookkeeping; still open the form
    }
    const params = new URLSearchParams();
    params.set('statement', finding.draftStatement);
    if (finding.entityRef) params.append('entityRef', finding.entityRef);
    params.append('qualityAttribute', finding.qualityAttribute);
    params.set('notes', `Drafted from recurring issues (${finding.theme}):\n${finding.issues.join('\n')}`);
    navigate(`/hypo-stage/create-hypothesis?${params.toString()}`);
  };

  const dismiss = async (finding: CoverageFinding) => {
    setBusyId(finding.id);
    try {
      await api.updateCoverageFinding(finding.id, 'dismissed');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (!report) {
    return <Progress />;
  }

  const r = report.reported;
  const p = report.planIssues;
  const relatedPct = r.total ? Math.round((r.related / r.total) * 100) : 0;

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" alignItems="flex-end" mb={2} style={{ gap: 16 }}>
        <FormControl style={{ minWidth: 180 }}>
          <InputLabel id="issues-report-period">Period</InputLabel>
          <Select labelId="issues-report-period" value={period} onChange={e => setPeriod(String(e.target.value))}>
            {PERIODS.map(option => (
              <MenuItem key={option.key} value={option.key}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={downloadMarkdown}>
          Download Markdown
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Tile label="Reported issues" value={r.total} hint={Object.entries(r.byClassification).map(([k, v]) => `${v} ${k}`).join(', ')} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tile label="Related to hypotheses" value={`${r.related} (${relatedPct}%)`} hint={`${r.unrelated} unrelated`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tile
            label="Closed within a day"
            value={r.resolution.sameDayPercent === null ? '—' : `${r.resolution.sameDayPercent}%`}
            hint={`median ${r.resolution.medianDaysToClose ?? '—'} days to close`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Tile label="Plan issues completed" value={`${p.completed} / ${p.total}`} hint={`${p.open} open, ${p.notPlanned} not planned`} />
        </Grid>

        <Grid item xs={12} md={6}>
          <CountTable title="Reported issues by quality attribute" header="Quality attribute" counts={r.byQualityAttribute} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CountTable title="Plan activities by action type" header="Action type" counts={p.byActionType} />
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Issues related to hypotheses
              </Typography>
              {r.byHypothesis.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No reported issue relates to a hypothesis in this period.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Hypothesis</TableCell>
                      <TableCell align="right">Issues</TableCell>
                      <TableCell>Evidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.byHypothesis.map(h => (
                      <TableRow key={h.hypothesisId}>
                        <TableCell>
                          <Link href={`/hypo-stage/hypothesis/${h.hypothesisId}`}>{h.statement ?? h.hypothesisId}</Link>
                        </TableCell>
                        <TableCell align="right">{h.issues}</TableCell>
                        <TableCell>
                          {Object.entries(h.evidence).map(([k, v]) => (
                            <Chip key={k} size="small" label={`${k}: ${v}`} style={{ marginRight: 4 }} />
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">Uncovered themes</Typography>
              <Typography variant="caption" color="textSecondary" component="div" style={{ marginBottom: 8 }}>
                Recurring issues no hypothesis covers, that took long to fix or kept coming back. Quick fixes are left out,
                as low-impact issues are outside ArchHypo&apos;s scope.
              </Typography>
              {report.uncovered.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No uncovered theme in this period.
                </Typography>
              ) : (
                report.uncovered.map(f => (
                  <Box key={f.id} mb={2} data-testid={`finding-${f.id}`}>
                    <Box display="flex" flexWrap="wrap" style={{ gap: 8 }} mb={0.5}>
                      <Chip size="small" color="primary" label={f.qualityAttribute} />
                      <Chip size="small" variant="outlined" label={f.entityRef ?? f.repository} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${f.impactProxy.issues} issues · median ${f.impactProxy.medianOpenDays} days open`}
                      />
                      {f.status !== 'pending' && <Chip size="small" label={f.status} />}
                    </Box>
                    <Typography variant="body2">{f.theme}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Draft hypothesis: {f.draftStatement}
                    </Typography>
                    {f.status === 'pending' && (
                      <Box display="flex" style={{ gap: 8 }} mt={1}>
                        <Button size="small" variant="contained" color="primary" disabled={busyId !== null} onClick={() => createHypothesis(f)}>
                          Create hypothesis
                        </Button>
                        <Button size="small" disabled={busyId !== null} onClick={() => dismiss(f)}>
                          Dismiss
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
