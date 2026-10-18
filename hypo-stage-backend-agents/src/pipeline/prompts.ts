import type { HypothesisRecord } from '../domain/archhypo';
import type { PullRequestDetails } from '../github/client';
import type { DiffDigest } from './context';

export const ARCHHYPO_PRIMER = `You support a software team that manages architectural uncertainty with ArchHypo.
- An architectural hypothesis is an uncertain, falsifiable statement relevant to the architecture.
- Uncertainty (Very Low..Very High) is how far the team is from accepting or refuting the hypothesis; it drops when new information arrives.
- Impact (Very Low..Very High) is the cost of changing to another alternative later; it drops when the affected part is isolated (e.g. modularization, anti-corruption layers).
- A technical planning is an action to handle a hypothesis: Experiment, Analytics, Spike, Tracer Bullet, Modularization, Trigger, Guideline or Other. Actions aim to accept/refute the hypothesis, reduce uncertainty, reduce impact, or define criteria to postpone handling it.
- A hypothesis is Validated or Discarded when the uncertainty is removed, and Trigger-Fired when its trigger condition is met.`;

export const TRIAGE_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

Task: given a pull request and a list of hypotheses, select the hypotheses the pull request may affect.
Rules:
- Only use hypothesis ids from the list. Never invent ids.
- A hypothesis is affected when the PR changes code, configuration or documentation related to its statement or to one of its technical plannings.
- Prefer returning an empty list over guessing.`;

export const ASSESS_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

Task: assess how one pull request affects one hypothesis and its technical plannings.
Rules:
- Ground every claim in the diff; cite files in "evidence".
- Set related=false and every optional field to null or [] when the PR does not really touch the hypothesis.
- reassessment: only when the PR brings evidence that changes uncertainty or impact. Keep a level null if it does not change. A reassessment must come with planningProgress or newPlanning, because levels change through technical plannings.
- planningProgress: only for technical planning ids listed for this hypothesis. Use "completes" only when the PR is merged and fully carries out the action.
- Expected outcomes may be written as "Goal: … Evidence: … Expected effect: …". A PR advances or completes that planning when it produces the stated evidence; when the evidence is met, base the reassessment on the stated expected effect. When updating such an expected outcome, describe only what changed.
- newPlanning: only when the PR reveals work that no existing planning covers. Keep description and expectedOutcome under 500 characters.
- statusChange: only when the PR is merged and removes the uncertainty (Validated/Discarded) or fires a trigger (Trigger-Fired).
- Be conservative: a wrong suggestion costs reviewer time.`;

function planningsBlock(h: HypothesisRecord, detailed: boolean): string {
  if (h.technicalPlannings.length === 0) {
    return '  technicalPlannings: none';
  }
  return [
    '  technicalPlannings:',
    ...h.technicalPlannings.map(p =>
      detailed
        ? [
            `    - id: ${p.id}`,
            `      actionType: ${p.actionType}`,
            `      entityRef: ${p.entityRef}`,
            `      description: ${p.description}`,
            `      expectedOutcome: ${p.expectedOutcome}`,
            `      targetDate: ${p.targetDate ?? 'unset'}`,
            `      documentations: ${p.documentations.join(', ') || 'none'}`,
          ].join('\n')
        : `    - ${p.actionType}: ${p.description}`,
    ),
  ].join('\n');
}

function prHeader(pr: PullRequestDetails): string {
  return [
    `Repository: ${pr.repository}`,
    `Pull request #${pr.number}: ${pr.title}`,
    `Merged: ${pr.merged ? 'yes' : 'no'}`,
    `Description:\n${(pr.body ?? '').slice(0, 2000) || '(empty)'}`,
  ].join('\n');
}

function patchesBlock(digest: DiffDigest, maxChars: number): string {
  const parts: string[] = [];
  let used = 0;
  for (const p of digest.patches) {
    const block = `--- ${p.filename}\n${p.patch}`;
    if (used + block.length > maxChars) {
      parts.push('… [more files omitted]');
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join('\n\n');
}

export function buildTriagePrompt(
  pr: PullRequestDetails,
  digest: DiffDigest,
  hypotheses: HypothesisRecord[],
  maxChars: number,
): string {
  const hypothesesBlock = hypotheses
    .map(h =>
      [
        `- id: ${h.id}`,
        `  statement: ${h.statement}`,
        `  qualityAttributes: ${h.qualityAttributes.join(', ') || 'none'}`,
        `  entityRefs: ${h.entityRefs.join(', ') || 'none'}`,
        planningsBlock(h, false),
      ].join('\n'),
    )
    .join('\n');

  const fixed = [prHeader(pr), `Changed files:\n${digest.fileList}`, `Hypotheses:\n${hypothesesBlock}`];
  const remaining = Math.max(1000, Math.floor(maxChars / 3) - fixed.join('').length);

  return [
    fixed[0],
    fixed[1],
    `Diff excerpt:\n${patchesBlock(digest, remaining)}`,
    fixed[2],
  ].join('\n\n');
}

export function buildAssessPrompt(
  pr: PullRequestDetails,
  digest: DiffDigest,
  hypothesis: HypothesisRecord,
  maxChars: number,
): string {
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

  const hypothesisBlock = [
    'Hypothesis:',
    `  id: ${hypothesis.id}`,
    `  statement: ${hypothesis.statement}`,
    `  status: ${hypothesis.status}`,
    `  sourceType: ${hypothesis.sourceType}`,
    `  uncertainty: ${hypothesis.uncertainty}`,
    `  impact: ${hypothesis.impact}`,
    `  qualityAttributes: ${hypothesis.qualityAttributes.join(', ') || 'none'}`,
    `  entityRefs: ${hypothesis.entityRefs.join(', ') || 'none'}`,
    `  notes: ${hypothesis.notes ?? 'none'}`,
    planningsBlock(hypothesis, true),
    `  recentEvolution:\n${history}`,
  ].join('\n');

  const fixed = `${prHeader(pr)}\n\n${hypothesisBlock}\n\nChanged files:\n${digest.fileList}`;
  const remaining = Math.max(1000, maxChars - fixed.length);

  return `${fixed}\n\nDiff:\n${patchesBlock(digest, remaining)}\n\nToday: ${new Date()
    .toISOString()
    .slice(0, 10)}`;
}
