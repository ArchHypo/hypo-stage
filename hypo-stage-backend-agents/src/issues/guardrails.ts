import type { HypothesisRecord } from '../domain/archhypo';
import type { DroppedProposal } from '../pipeline/guardrails';
import { clampText } from '../pipeline/guardrails';
import type { NewSuggestion } from '../store/suggestions';
import type { EvidenceType } from '../store/issues';
import type { IssueAssessOutput } from './schemas';

export interface IssueGuardResult {
  suggestions: NewSuggestion[];
  dropped: DroppedProposal[];
  /** Evidence recorded in the issue observation (also for alerts and the report). */
  related: { hypothesisId: string; evidenceType: EvidenceType } | null;
}

/**
 * Issue triage may only link issues, flag a fired Trigger, or (via alerts) point the team at
 * accumulated evidence. It never reassesses: a report is a claim, and ArchHypo leaves the
 * assessment to the team.
 */
export function guardIssueAssessment(ctx: {
  hypothesis: HypothesisRecord;
  assessment: IssueAssessOutput;
  issueUrl: string;
  issueNumber: number;
  confidenceThreshold: number;
}): IssueGuardResult {
  const { hypothesis, assessment } = ctx;
  const confidence = Math.max(0, Math.min(1, Number(assessment.confidence) || 0));
  if (!assessment.related || assessment.evidenceType === 'unrelated') {
    return { suggestions: [], dropped: [{ kind: 'assessment', reason: 'model marked it unrelated' }], related: null };
  }
  if (confidence < ctx.confidenceThreshold) {
    return {
      suggestions: [],
      dropped: [{ kind: 'assessment', reason: `confidence ${confidence} below threshold ${ctx.confidenceThreshold}` }],
      related: null,
    };
  }

  const rationale = clampText(assessment.rationale || `Reported in issue #${ctx.issueNumber}.`, 1000);
  const base = { hypothesisId: hypothesis.id, confidence, evidence: [] };
  const suggestions: NewSuggestion[] = [];
  const dropped: DroppedProposal[] = [];

  if (hypothesis.relatedArtefacts.includes(ctx.issueUrl)) {
    dropped.push({ kind: 'link', reason: 'issue is already a related artefact' });
  } else {
    suggestions.push({ ...base, kind: 'link', technicalPlanningId: null, payload: { url: ctx.issueUrl }, rationale });
  }

  let evidenceType: EvidenceType = assessment.evidenceType;
  if (evidenceType === 'trigger_fired') {
    const trigger = hypothesis.technicalPlannings.find(
      p => p.id === assessment.triggerPlanningId && p.actionType === 'Trigger',
    );
    if (!trigger) {
      dropped.push({ kind: 'status_change', reason: 'no Trigger planning of this hypothesis matches' });
      evidenceType = 'contradicts';
    } else if (hypothesis.status === 'Trigger-Fired') {
      dropped.push({ kind: 'status_change', reason: 'hypothesis is already Trigger-Fired' });
    } else {
      suggestions.push({
        ...base,
        kind: 'status_change',
        technicalPlanningId: trigger.id,
        payload: { status: 'Trigger-Fired', previous: hypothesis.status },
        rationale: clampText(`Reported by #${ctx.issueNumber}: ${rationale}`, 1000),
      });
    }
  }

  return { suggestions, dropped, related: { hypothesisId: hypothesis.id, evidenceType } };
}
