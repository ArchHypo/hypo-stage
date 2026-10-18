/**
 * Deterministic reading of a hypothesis assessment into an ArchHypo handling strategy.
 * Computed in code so that even small
 * models receive explicit guidance grounded in the technique.
 */
export const PLAN_GOALS = [
  'accept_or_refute',
  'reduce_uncertainty',
  'reduce_impact',
  'define_postponement_criteria',
] as const;
export type PlanGoal = (typeof PLAN_GOALS)[number];

export const GOAL_LABELS: Record<PlanGoal, string> = {
  accept_or_refute: 'Accept or refute',
  reduce_uncertainty: 'Reduce uncertainty',
  reduce_impact: 'Reduce impact',
  define_postponement_criteria: 'Define postponement criteria',
};

export type StrategyProfileName =
  | 'act_now'
  | 'investigate'
  | 'postpone_with_criteria'
  | 'reduce_impact'
  | 'monitor'
  | 'balanced';

export interface StrategyProfile {
  profile: StrategyProfileName;
  /** At least one proposed action should have one of these goals. */
  requiredGoals: PlanGoal[];
  /** Latest iteration (1-based) in which a required-goal action should happen. */
  requiredBy: number;
  guidance: string;
}

type Band = 'low' | 'medium' | 'high';

export function band(level: string): Band {
  if (level === 'High' || level === 'Very High') return 'high';
  if (level === 'Medium') return 'medium';
  return 'low';
}

export function strategyProfile(uncertainty: string, impact: string): StrategyProfile {
  const u = band(uncertainty);
  const i = band(impact);

  if (u === 'high' && i === 'high') {
    return {
      profile: 'act_now',
      requiredGoals: ['accept_or_refute', 'reduce_uncertainty'],
      requiredBy: 1,
      guidance:
        'High uncertainty and high impact: handle it in the first iteration. Plan at least one action that accepts/refutes the hypothesis or reduces its uncertainty in iteration 1 (e.g. Analytics with existing data or projections, a Spike, an Experiment). Consider a parallel action that reduces the impact (e.g. structuring the affected part so it can change later), which can be dropped if the uncertainty resolves favourably.',
    };
  }
  if (u === 'high' && i === 'medium') {
    return {
      profile: 'investigate',
      requiredGoals: ['reduce_uncertainty', 'accept_or_refute'],
      requiredBy: 2,
      guidance:
        'High uncertainty with medium impact: gather information early. Plan an action that reduces the uncertainty within iterations 1-2, and a cheap Trigger that defines when the team must decide.',
    };
  }
  if (i === 'low' && u !== 'low') {
    return {
      profile: 'postpone_with_criteria',
      requiredGoals: ['define_postponement_criteria'],
      requiredBy: 3,
      guidance:
        'Low impact: changing later is cheap, so the decision can be postponed to its most responsible moment. Define criteria to postpone it (an architectural Trigger or agile landing zone on the related quality attribute). Only add cheap information gathering; avoid expensive actions.',
    };
  }
  if (u === 'low' && i === 'high') {
    return {
      profile: 'reduce_impact',
      requiredGoals: ['reduce_impact', 'accept_or_refute'],
      requiredBy: 2,
      guidance:
        'Low uncertainty but high impact: the team knows enough but a wrong choice is costly. Reduce the impact by isolating the affected part (Modularization, anti-corruption layer, interceptors) or settle the hypothesis end to end (Tracer Bullet).',
    };
  }
  if (u === 'low') {
    return {
      profile: 'monitor',
      requiredGoals: [],
      requiredBy: 3,
      guidance:
        'Low uncertainty and low/medium impact: little is left to handle. Keep it monitored with a lightweight Guideline or Trigger; if no uncertainty remains the team may remove the hypothesis.',
    };
  }
  return {
    profile: 'balanced',
    requiredGoals: ['reduce_uncertainty', 'reduce_impact'],
    requiredBy: 2,
    guidance:
      'Medium uncertainty with medium/high impact: combine an action that reduces the uncertainty with one that reduces the impact. Guidelines that adjust how the team works are often enough.',
  };
}
