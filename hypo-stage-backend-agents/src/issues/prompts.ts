import type { HypothesisRecord } from '../domain/archhypo';
import type { IssueDetails } from '../github/client';
import { ARCHHYPO_PRIMER } from '../pipeline/prompts';

const ISSUE_RULES = `About issues (from the ArchHypo evaluation, where the team analysed every support issue after release):
- Most issues are ordinary bugs or improvement requests that are NOT about any architectural uncertainty. Returning no candidates is the normal outcome.
- An issue is a report by a person, not verified evidence. It can support a hypothesis, contradict it (the uncertainty seems to be materializing), or meet the condition of an architectural Trigger.
- Only use hypothesis and planning ids from the lists. Never invent ids.`;

export const ISSUE_TRIAGE_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

Task: classify one GitHub issue (bug, improvement, question or other), name the quality attributes it concerns, and select the hypotheses it may be evidence about.

${ISSUE_RULES}`;

export const ISSUE_ASSESS_SYSTEM_PROMPT = `${ARCHHYPO_PRIMER}

Task: decide whether one GitHub issue is evidence about one hypothesis, and of which type.

${ISSUE_RULES}
- trigger_fired only when the issue describes the condition stated in one of the hypothesis's Trigger plannings; give that planning id.
- Be conservative: set related=false when the link is only thematic.`;

export function issueText(issue: IssueDetails, maxChars: number): string {
  const comments = issue.commentThread
    .map(c => `- ${c.author ?? 'someone'} (${c.createdAt.slice(0, 10)}): ${c.body.slice(0, 800)}`)
    .join('\n');
  const text = [
    `Repository: ${issue.repository}`,
    `Issue #${issue.number}: ${issue.title}`,
    `State: ${issue.state}${issue.stateReason ? ` (${issue.stateReason})` : ''}`,
    `Labels: ${issue.labels.join(', ') || 'none'}`,
    `Opened: ${issue.createdAt.slice(0, 10)}${issue.closedAt ? `, closed: ${issue.closedAt.slice(0, 10)}` : ''}`,
    `Body:\n${(issue.body ?? '').slice(0, 4000) || '(empty)'}`,
    comments ? `Comments:\n${comments}` : 'Comments: none',
  ].join('\n');
  return text.slice(0, maxChars);
}

function planningsBlock(h: HypothesisRecord, detailed: boolean): string {
  if (h.technicalPlannings.length === 0) return '  technicalPlannings: none';
  return [
    '  technicalPlannings:',
    ...h.technicalPlannings.map(p =>
      detailed || p.actionType === 'Trigger'
        ? `    - id: ${p.id}\n      actionType: ${p.actionType}\n      description: ${p.description}\n      expectedOutcome: ${p.expectedOutcome}`
        : `    - ${p.actionType}: ${p.description}`,
    ),
  ].join('\n');
}

export function buildIssueTriagePrompt(issue: IssueDetails, hypotheses: HypothesisRecord[], maxChars: number) {
  const list =
    hypotheses.length === 0
      ? 'none'
      : hypotheses
          .map(h =>
            [
              `- id: ${h.id}`,
              `  statement: ${h.statement}`,
              `  qualityAttributes: ${h.qualityAttributes.join(', ') || 'none'}`,
              planningsBlock(h, false),
            ].join('\n'),
          )
          .join('\n');
  return `${issueText(issue, Math.floor(maxChars / 2))}\n\nHypotheses:\n${list}`;
}

export function buildIssueAssessPrompt(issue: IssueDetails, h: HypothesisRecord, maxChars: number) {
  return [
    issueText(issue, Math.floor(maxChars * 0.7)),
    '',
    'Hypothesis:',
    `  id: ${h.id}`,
    `  statement: ${h.statement}`,
    `  status: ${h.status}`,
    `  uncertainty: ${h.uncertainty}`,
    `  impact: ${h.impact}`,
    `  qualityAttributes: ${h.qualityAttributes.join(', ') || 'none'}`,
    planningsBlock(h, true),
  ].join('\n');
}
