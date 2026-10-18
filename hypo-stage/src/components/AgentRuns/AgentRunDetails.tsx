import { default as React, useEffect, useState } from 'react';
import { Box, Chip, Link, Typography } from '@material-ui/core';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  AgentAssessDetails,
  AgentRunDetail,
  AgentTriageDetails,
  HypoStageApiRef,
} from '../../api/HypoStageApi';

interface AgentRunDetailsProps {
  runId: string;
  /** Hypothesis id → statement, to show statements instead of ids. */
  statements: Map<string, string>;
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box mt={2}>
    <Typography variant="subtitle2">{title}</Typography>
    {children}
  </Box>
);

const Line = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="body2" component="div">
    {children}
  </Typography>
);

const Muted = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="caption" color="textSecondary" component="span">
    {children}
  </Typography>
);

export const AgentRunDetails = ({ runId, statements }: AgentRunDetailsProps) => {
  const api = useApi(HypoStageApiRef);
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAgentRun(runId)
      .then(result => !cancelled && setRun(result))
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
  }, [api, runId]);

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  if (!run) {
    return <Progress />;
  }

  const steps = run.trace?.steps ?? [];
  const context = steps.find(s => s.step === 'context')?.details ?? {};
  const triage = steps.find(s => s.step === 'triage')?.details as AgentTriageDetails | undefined;
  const assessments = steps.filter(s => s.step === 'assess');
  const planSync = steps.find(s => s.step === 'plan_sync')?.details as { outcome?: string } | undefined;
  const isIssue = run.artifactKind === 'issue';
  const returned = triage ? triage.returned ?? triage.selected.length + (triage.dropped ?? []).length : 0;
  const tokens = steps.reduce((sum, s) => sum + (s.inputTokens ?? 0) + (s.outputTokens ?? 0), 0);
  const label = (id: string) => statements.get(id) ?? id;
  const hypothesisLink = (id: string) =>
    statements.has(id) ? (
      <Link href={`/hypo-stage/hypothesis/${id}`}>{label(id)}</Link>
    ) : (
      <code>{id}</code>
    );

  return (
    <Box px={3} py={2} data-testid={`agent-run-details-${run.id}`}>
      <Line>
        <Muted>
          Scope: {run.trace?.scope ?? '—'} · Hypotheses in scope: {run.trace?.hypothesesInScope ?? '—'} ·{' '}
          {isIssue
            ? `Issue state: ${String(context.state ?? '—')} · Comments: ${String(context.comments ?? '—')} · Reopened: ${String(context.reopened ?? 0)}`
            : `Files: ${String(context.files ?? '—')} · Merged: ${context.merged ? 'yes' : 'no'}`}{' '}
          · Tokens: {tokens}
        </Muted>
      </Line>

      {run.status === 'failed' && run.error && (
        <Box mt={1} p={1} style={{ background: '#ffebee', borderRadius: 4 }}>
          <Typography variant="body2" color="error">
            {run.error}
          </Typography>
        </Box>
      )}
      {run.trace?.skippedReason && <Line>Skipped: {run.trace.skippedReason}</Line>}

      {planSync?.outcome && <Line>Plan issue sync: {planSync.outcome}</Line>}

      {triage && (
        <Section title={`Triage (${returned} returned by the model)`}>
          {triage.classification && (
            <Line>
              <Muted>
                Classified as {triage.classification}
                {triage.qualityAttributes?.length ? ` · ${triage.qualityAttributes.join(', ')}` : ''}
              </Muted>
            </Line>
          )}
          {triage.selected.map(c => (
            <Line key={`sel-${c.id}`}>
              ✓ {hypothesisLink(c.id)} <Muted>relevance {c.relevance}{c.reason ? ` — ${c.reason}` : ''}</Muted>
            </Line>
          ))}
          {(triage.dropped ?? []).map((c, i) => (
            <Line key={`drop-${i}`}>
              ✗ {hypothesisLink(c.id)} <Muted>relevance {c.relevance} — dropped: {c.reason}</Muted>
            </Line>
          ))}
          {triage.selected.length === 0 && (triage.dropped ?? []).length === 0 && (
            <Line>
              <Muted>No candidates</Muted>
            </Line>
          )}
        </Section>
      )}

      {assessments.map((step, index) => {
        const details = step.details as unknown as AgentAssessDetails;
        const model = details.model;
        return (
          <Section key={index} title="Assessment">
            <Line>{hypothesisLink(details.hypothesisId)}</Line>
            {model && (
              <Line>
                <Muted>
                  Model: related={String(model.related)}, confidence {model.confidence}
                  {model.evidenceType && `, evidence: ${model.evidenceType}`}
                  {model.reassessment &&
                    `, reassessment uncertainty=${model.reassessment.uncertainty ?? 'same'} impact=${
                      model.reassessment.impact ?? 'same'
                    }`}
                  {(model.planningProgress ?? []).length > 0 &&
                    `, planning progress: ${(model.planningProgress ?? []).map(p => p.effect).join(', ')}`}
                  {model.newPlanning && `, new planning: ${model.newPlanning.actionType}`}
                  {model.statusChange && `, status → ${model.statusChange.status}`}
                </Muted>
              </Line>
            )}
            {(details.kept ?? []).length > 0 && (
              <Box display="flex" flexWrap="wrap" style={{ gap: 4 }} mt={0.5}>
                {details.kept!.map((kind, i) => (
                  <Chip key={i} size="small" color="primary" label={kind} />
                ))}
              </Box>
            )}
            {(details.dropped ?? []).map((d, i) => (
              <Line key={i}>
                ✗ <Muted>{d.kind} dropped: {d.reason}</Muted>
              </Line>
            ))}
            <Muted>
              {step.durationMs} ms · {(step.inputTokens ?? 0) + (step.outputTokens ?? 0)} tokens
            </Muted>
          </Section>
        );
      })}

      <Section title={`Suggestions (${run.suggestions.length})`}>
        {run.suggestions.length === 0 && (
          <Line>
            <Muted>None stored</Muted>
          </Line>
        )}
        {run.suggestions.map(s => (
          <Line key={s.id}>
            <Chip size="small" label={s.kind} style={{ marginRight: 8 }} />
            <Chip size="small" variant="outlined" label={s.status} style={{ marginRight: 8 }} />
            {hypothesisLink(s.hypothesisId)}
          </Line>
        ))}
      </Section>
    </Box>
  );
};
