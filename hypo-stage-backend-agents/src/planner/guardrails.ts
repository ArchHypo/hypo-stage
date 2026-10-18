import { ACTION_TYPES, HypothesisRecord, LIKERT_SCALE, MAX_TEXT_LENGTH } from '../domain/archhypo';
import { clampText, normalizeTargetDate } from '../pipeline/guardrails';
import type { PlanProposalOutput } from './schemas';
import { GOAL_LABELS, PLAN_GOALS, PlanGoal, StrategyProfile } from './strategy';

const MAX_ITERATION = 6;

export interface PlannedAction {
  actionType: (typeof ACTION_TYPES)[number];
  goal: PlanGoal;
  entityRef: string;
  description: string;
  /** Composed "Goal: … Evidence: … Expected effect: …" text, ≤ 500 characters. */
  expectedOutcome: string;
  evidence: string;
  expectedEffect: { uncertainty: string | null; impact: string | null };
  iteration: number;
  targetDate: string;
  rationale: string;
}

export interface GuardedPlan {
  reading: string;
  actions: PlannedAction[];
  warnings: string[];
}

const rank = (level: string) => LIKERT_SCALE.indexOf(level as (typeof LIKERT_SCALE)[number]);
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Only levels lower than today's, and only the ones the goal can move. */
function guardEffect(
  goal: PlanGoal,
  effect: { uncertainty: string | null; impact: string | null },
  current: { uncertainty: string; impact: string },
) {
  const lower = (next: string | null, now: string) =>
    next && rank(next) >= 0 && rank(next) < rank(now) ? next : null;
  const movesUncertainty = goal === 'accept_or_refute' || goal === 'reduce_uncertainty';
  const movesImpact = goal === 'reduce_impact';
  return {
    uncertainty: movesUncertainty ? lower(effect.uncertainty, current.uncertainty) : null,
    impact: movesImpact ? lower(effect.impact, current.impact) : null,
  };
}

export function composeExpectedOutcome(
  goal: PlanGoal,
  evidence: string,
  effect: { uncertainty: string | null; impact: string | null },
  current: { uncertainty: string; impact: string },
): string {
  const effects = [
    effect.uncertainty && `uncertainty ${current.uncertainty} → ${effect.uncertainty}`,
    effect.impact && `impact ${current.impact} → ${effect.impact}`,
  ].filter(Boolean);
  const head = `Goal: ${GOAL_LABELS[goal]}. Evidence: `;
  const tail = `. Expected effect: ${effects.length > 0 ? effects.join('; ') : 'levels unchanged'}.`;
  const room = MAX_TEXT_LENGTH - head.length - tail.length;
  const cleanEvidence = evidence.trim().replace(/\.+$/, '');
  return `${head}${clampText(cleanEvidence, Math.max(20, room))}${tail}`.slice(0, MAX_TEXT_LENGTH);
}

/** Turns the model output into actions the hypo-stage backend accepts, with warnings. */
export function guardPlan(
  hypothesis: HypothesisRecord,
  output: PlanProposalOutput,
  profile: StrategyProfile,
  options: { maxActions: number; iterationDays: number; today?: Date },
): GuardedPlan {
  const today = options.today ?? new Date();
  const current = { uncertainty: hypothesis.uncertainty, impact: hypothesis.impact };
  const seen = new Set(hypothesis.technicalPlannings.map(p => normalize(p.description)));
  const warnings: string[] = [];
  const actions: PlannedAction[] = [];

  for (const a of output.actions ?? []) {
    if (actions.length >= options.maxActions) break;
    if (!(ACTION_TYPES as readonly string[]).includes(a.actionType)) continue;
    if (!(PLAN_GOALS as readonly string[]).includes(a.goal)) continue;
    const description = clampText(a.description ?? '');
    if (!description || !a.evidence?.trim()) continue;
    const key = normalize(description);
    if (seen.has(key)) continue;
    seen.add(key);

    const entityRef =
      a.entityRef && hypothesis.entityRefs.includes(a.entityRef) ? a.entityRef : hypothesis.entityRefs[0];
    const iteration = Math.min(MAX_ITERATION, Math.max(1, Math.round(Number(a.iteration) || 1)));
    const expectedEffect = guardEffect(a.goal, a.expectedEffect ?? { uncertainty: null, impact: null }, current);

    actions.push({
      actionType: a.actionType,
      goal: a.goal,
      entityRef,
      description,
      evidence: clampText(a.evidence, 400),
      expectedOutcome: composeExpectedOutcome(a.goal, a.evidence, expectedEffect, current),
      expectedEffect,
      iteration,
      targetDate: normalizeTargetDate(addDays(today, iteration * options.iterationDays), today),
      rationale: clampText(a.rationale ?? '', 500),
    });
  }

  if (actions.length === 0) {
    warnings.push('The model did not propose any usable action; try again or plan manually.');
  } else {
    const required = profile.requiredGoals;
    if (
      required.length > 0 &&
      !actions.some(a => required.includes(a.goal) && a.iteration <= profile.requiredBy)
    ) {
      warnings.push(
        `For this assessment (${profile.profile}) ArchHypo suggests an action to ${required
          .map(g => GOAL_LABELS[g].toLowerCase())
          .join(' or ')} by iteration ${profile.requiredBy}; none of the proposals does.`,
      );
    }
    if (actions.length >= 3 && actions.every(a => a.actionType === 'Spike')) {
      warnings.push('All proposals are Spikes; consider Guidelines or other actions as well.');
    }
  }

  return { reading: clampText(output.reading ?? '', 800), actions, warnings };
}
