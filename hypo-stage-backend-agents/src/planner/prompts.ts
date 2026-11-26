import type { HypothesisRecord } from '../domain/archhypo';
import { ARCHHYPO_PRIMER } from '../pipeline/prompts';
import { ACTION_CATALOGUE } from './catalogue';
import type { StrategyProfile } from './strategy';

export interface ComponentInfo {
  entityRef: string;
  description: string | null;
  system: string | null;
}

export const PLANNER_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

You design the technical plan for ONE architectural hypothesis, as an experienced architect using ArchHypo.

${ACTION_CATALOGUE}

Rules:
- Follow the strategy given for this hypothesis; it comes from its uncertainty and impact assessment.
- Propose 2 to 4 complementary actions with different purposes. Do not propose only Spikes; consider Guidelines, which teams found very effective.
- Make every action specific to this hypothesis and its components. The techniques are pointers, not recipes: be creative in how they are applied.
- "evidence" must be observable and measurable, with a threshold when possible, and say which result changes which level (e.g. "If one node sustains 1000 rps at p95 < 200 ms, uncertainty drops to Low; otherwise the hypothesis is refuted").
- expectedEffect states the levels after the action succeeds. Plans only lower levels; use null for a level the action does not change.
- iteration: 1 is the next iteration. Put urgent actions first.
- Complement the existing technical plannings; never repeat them.
- Uncertainty is lack of information, not probability. Do not reassess the hypothesis itself.`;

export function buildPlannerPrompt(
  hypothesis: HypothesisRecord,
  profile: StrategyProfile,
  components: ComponentInfo[],
): string {
  const plannings =
    hypothesis.technicalPlannings.length === 0
      ? '  none'
      : hypothesis.technicalPlannings
          .map(
            p =>
              `  - ${p.actionType} (target ${p.targetDate ?? 'unset'}): ${p.description}\n    expected outcome: ${p.expectedOutcome}`,
          )
          .join('\n');
  const history =
    hypothesis.recentEvents.length === 0
      ? '  none'
      : hypothesis.recentEvents
          .map(
            e =>
              `  - ${e.timestamp.slice(0, 10)} ${e.eventType}${
                e.uncertainty ? ` uncertainty=${e.uncertainty}` : ''
              }${e.impact ? ` impact=${e.impact}` : ''}`,
          )
          .join('\n');
  const componentLines =
    components.length === 0
      ? '  none'
      : components
          .map(
            c =>
              `  - ${c.entityRef}${c.system ? ` (system ${c.system})` : ''}${
                c.description ? `: ${c.description}` : ''
              }`,
          )
          .join('\n');

  return [
    'Hypothesis:',
    `  statement: ${hypothesis.statement}`,
    `  sourceType: ${hypothesis.sourceType}`,
    `  qualityAttributes: ${hypothesis.qualityAttributes.join(', ') || 'none'}`,
    `  status: ${hypothesis.status}`,
    `  uncertainty: ${hypothesis.uncertainty}`,
    `  impact: ${hypothesis.impact}`,
    `  notes: ${hypothesis.notes ?? 'none'}`,
    `Components:\n${componentLines}`,
    `Existing technical plannings:\n${plannings}`,
    `Recent evolution:\n${history}`,
    '',
    `Strategy (${profile.profile}): ${profile.guidance}`,
    '',
    `Today: ${new Date().toISOString().slice(0, 10)}`,
  ].join('\n');
}
