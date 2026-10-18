import { HypothesisRecord, MAX_TEXT_LENGTH } from '../domain/archhypo';
import type { Evidence, NewSuggestion, SuggestionKind } from '../store/suggestions';
import type { AssessmentOutput } from './schemas';

const MAX_EVIDENCE = 10;
const DEFAULT_PLANNING_HORIZON_DAYS = 14;

export interface GuardrailContext {
  hypothesis: HypothesisRecord;
  assessment: AssessmentOutput;
  prUrl: string;
  prMerged: boolean;
  changedFiles: string[];
  confidenceThreshold: number;
  today?: Date;
  /**
   * Suggestion kinds this handler may emit. Handlers triggered by artifacts HypoStage created
   * (plan issues) are restricted so they can only update the plan they mirror.
   */
  allowedKinds?: SuggestionKind[];
  /** Plannings already recorded as completed: "completes" is not proposed again for them. */
  completedPlanningIds?: Set<string>;
}

export function clampText(value: string, max = MAX_TEXT_LENGTH): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/**
 * Expected outcomes written by the plan designer start with "Goal: … Evidence: …". When a
 * PR updates such an outcome, keep that prefix so the goal and its evidence are not lost.
 */
export function preserveGoalPrefix(original: string, update: string): string {
  const next = update.trim();
  if (!/^goal:/i.test(original.trim()) || /^goal:/i.test(next)) {
    return clampText(next);
  }
  const head = clampText(original.split(/\s*Expected effect:/i)[0].trim().replace(/\.?$/, '.'), 380);
  const prefix = `${head} Update: `;
  return `${prefix}${clampText(next, Math.max(40, MAX_TEXT_LENGTH - prefix.length))}`.slice(
    0,
    MAX_TEXT_LENGTH,
  );
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Accepts YYYY-MM-DD dates the backend schema accepts (years 2000-2100), not in the past. */
export function normalizeTargetDate(value: string | null, today: Date): string {
  const fallback = addDays(today, DEFAULT_PLANNING_HORIZON_DAYS);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  const year = parsed.getUTCFullYear();
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return fallback;
  }
  if (year < 2000 || year > 2100 || value < today.toISOString().slice(0, 10)) {
    return fallback;
  }
  return value;
}

function filterEvidence(evidence: Evidence[], changedFiles: string[]): Evidence[] {
  const files = new Set(changedFiles);
  return evidence
    .filter(e => files.has(e.file.trim()))
    .slice(0, MAX_EVIDENCE)
    .map(e => ({ file: e.file.trim(), note: clampText(e.note, 300) }));
}

/** Why a proposed suggestion was not stored; kept in the run trace for debugging. */
export interface DroppedProposal {
  kind: SuggestionKind | 'assessment';
  reason: string;
  technicalPlanningId?: string;
}

export interface GuardrailResult {
  suggestions: NewSuggestion[];
  dropped: DroppedProposal[];
}

/**
 * Step 3: turns one model assessment into suggestions that are safe to store and that
 * the original backend API will accept when a reviewer applies them. Everything the
 * model proposed but that was not kept is reported in `dropped`.
 */
export function applyGuardrails(ctx: GuardrailContext): GuardrailResult {
  const { hypothesis, assessment } = ctx;
  const dropped: DroppedProposal[] = [];
  const confidence = Math.max(0, Math.min(1, Number(assessment.confidence) || 0));
  if (!assessment.related) {
    return { suggestions: [], dropped: [{ kind: 'assessment', reason: 'model marked it unrelated' }] };
  }
  if (confidence < ctx.confidenceThreshold) {
    return {
      suggestions: [],
      dropped: [
        {
          kind: 'assessment',
          reason: `confidence ${confidence} below threshold ${ctx.confidenceThreshold}`,
        },
      ],
    };
  }

  const today = ctx.today ?? new Date();
  const rationale = clampText(assessment.rationale || 'Related to this pull request.', 1000);
  const evidence = filterEvidence(assessment.evidence ?? [], ctx.changedFiles);
  const base = { hypothesisId: hypothesis.id, confidence, evidence };
  const suggestions: NewSuggestion[] = [];

  if (!hypothesis.relatedArtefacts.includes(ctx.prUrl)) {
    suggestions.push({
      ...base,
      kind: 'link',
      technicalPlanningId: null,
      payload: { url: ctx.prUrl },
      rationale,
    });
  } else {
    dropped.push({ kind: 'link', reason: 'PR is already a related artefact' });
  }

  const planningIds = new Set(hypothesis.technicalPlannings.map(p => p.id));
  const progress: AssessmentOutput['planningProgress'] = [];
  (assessment.planningProgress ?? []).forEach((p, i, all) => {
    const drop = (reason: string) =>
      dropped.push({ kind: 'planning_progress', reason, technicalPlanningId: p.technicalPlanningId });
    if (!planningIds.has(p.technicalPlanningId)) {
      drop('unknown technical planning id for this hypothesis');
    } else if (all.findIndex(o => o.technicalPlanningId === p.technicalPlanningId) !== i) {
      drop('duplicate planning');
    } else if (p.effect === 'completes' && !ctx.prMerged) {
      drop('"completes" requires a merged PR');
    } else {
      progress.push(p);
    }
  });

  for (const p of progress) {
    const planning = hypothesis.technicalPlannings.find(tp => tp.id === p.technicalPlanningId)!;
    const updated = p.expectedOutcomeUpdate
      ? preserveGoalPrefix(planning.expectedOutcome, p.expectedOutcomeUpdate)
      : null;
    const expectedOutcome = updated === planning.expectedOutcome ? null : updated;
    if (p.effect === 'completes' && ctx.completedPlanningIds?.has(planning.id)) {
      // Still anchors a reassessment below; only the completion itself is not repeated.
      dropped.push({
        kind: 'planning_progress',
        reason: 'planning already completed',
        technicalPlanningId: planning.id,
      });
      continue;
    }
    // An "advances" adds nothing when the artifact is already documented and the outcome is
    // unchanged; a "completes" is new information even then.
    if (p.effect === 'advances' && !expectedOutcome && planning.documentations.includes(ctx.prUrl)) {
      dropped.push({
        kind: 'planning_progress',
        reason: 'PR already in planning documentations and no outcome change',
        technicalPlanningId: planning.id,
      });
      continue;
    }
    suggestions.push({
      ...base,
      kind: 'planning_progress',
      technicalPlanningId: planning.id,
      payload: { effect: p.effect, expectedOutcome },
      rationale: clampText(p.reason || rationale, 1000),
    });
  }

  // The backend only changes uncertainty/impact through a technical planning (recorded
  // as a TECHNICAL_PLANNING_* event), so a reassessment needs a planning to anchor to:
  // the planning this PR executes, or else the new planning being proposed.
  const re = assessment.reassessment;
  const levels = re
    ? {
        uncertainty: re.uncertainty ?? hypothesis.uncertainty,
        impact: re.impact ?? hypothesis.impact,
      }
    : null;
  const levelsChanged =
    levels !== null &&
    (levels.uncertainty !== hypothesis.uncertainty || levels.impact !== hypothesis.impact);
  const anchorPlanningId = progress[0]?.technicalPlanningId ?? null;

  if (re && !levelsChanged) {
    dropped.push({ kind: 'reassessment', reason: 'same levels as current' });
  } else if (re && levels && anchorPlanningId) {
    suggestions.push({
      ...base,
      kind: 'reassessment',
      technicalPlanningId: anchorPlanningId,
      payload: {
        ...levels,
        previous: { uncertainty: hypothesis.uncertainty, impact: hypothesis.impact },
      },
      rationale: clampText(re.reason || rationale, 1000),
    });
  }

  const np = assessment.newPlanning;
  let reassessmentCarried = false;
  if (np && !(np.description.trim() && np.expectedOutcome.trim())) {
    dropped.push({ kind: 'new_planning', reason: 'empty description or expected outcome' });
  } else if (np) {
    const entityRef =
      np.entityRef && hypothesis.entityRefs.includes(np.entityRef)
        ? np.entityRef
        : hypothesis.entityRefs[0];
    if (!entityRef) {
      dropped.push({ kind: 'new_planning', reason: 'hypothesis has no entity refs' });
    } else {
      reassessmentCarried = levelsChanged && !anchorPlanningId;
      suggestions.push({
        ...base,
        kind: 'new_planning',
        technicalPlanningId: null,
        payload: {
          actionType: np.actionType,
          entityRef,
          description: clampText(np.description),
          expectedOutcome: clampText(np.expectedOutcome),
          targetDate: normalizeTargetDate(np.targetDate, today),
          ...(reassessmentCarried
            ? {
                uncertainty: levels!.uncertainty,
                impact: levels!.impact,
                previous: { uncertainty: hypothesis.uncertainty, impact: hypothesis.impact },
              }
            : {}),
        },
        rationale: clampText(
          reassessmentCarried && re?.reason ? `${np.reason} ${re.reason}` : np.reason || rationale,
          1000,
        ),
      });
    }
  }
  if (levelsChanged && !anchorPlanningId && !reassessmentCarried) {
    dropped.push({
      kind: 'reassessment',
      reason: 'no technical planning to record it on (no planning progress or new planning)',
    });
  }

  const sc = assessment.statusChange;
  if (sc && !ctx.prMerged) {
    dropped.push({ kind: 'status_change', reason: 'status changes require a merged PR' });
  } else if (sc && sc.status === hypothesis.status) {
    dropped.push({ kind: 'status_change', reason: 'same status as current' });
  } else if (sc) {
    suggestions.push({
      ...base,
      kind: 'status_change',
      technicalPlanningId: null,
      payload: { status: sc.status, previous: hypothesis.status },
      rationale: clampText(sc.reason || rationale, 1000),
    });
  }

  if (ctx.allowedKinds) {
    const allowed = new Set(ctx.allowedKinds);
    for (const s of suggestions.filter(x => !allowed.has(x.kind))) {
      dropped.push({ kind: s.kind, reason: 'not allowed for this handler' });
    }
    return { suggestions: suggestions.filter(x => allowed.has(x.kind)), dropped };
  }
  return { suggestions, dropped };
}
