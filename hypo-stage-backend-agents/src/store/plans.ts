import crypto from 'crypto';
import type { Knex } from 'knex';

export type PlanActionDecision = 'added' | 'edited' | 'dismissed';

export async function insertPlanProposal(
  knex: Knex,
  proposal: {
    hypothesisId: string;
    requestedBy: string | null;
    modelKey: string;
    provider: string;
    profile: string;
    status: 'completed' | 'failed';
    error?: string;
    result?: unknown;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  await knex('agent_plan_proposals').insert({
    id,
    hypothesis_id: proposal.hypothesisId,
    requested_by: proposal.requestedBy,
    model_key: proposal.modelKey,
    provider: proposal.provider,
    profile: proposal.profile,
    status: proposal.status,
    error: proposal.error ?? null,
    result: proposal.result === undefined ? null : JSON.stringify(proposal.result),
    duration_ms: proposal.durationMs,
    input_tokens: proposal.inputTokens ?? null,
    output_tokens: proposal.outputTokens ?? null,
  });
  return id;
}

/**
 * Records what the reviewer did with one proposed action. Returns 'not_found' for an
 * unknown proposal or index and 'conflict' when the action already has a decision.
 */
export async function decidePlanAction(
  knex: Knex,
  input: {
    proposalId: string;
    index: number;
    decision: PlanActionDecision;
    technicalPlanningId: string | null;
    decidedBy: string;
  },
): Promise<'ok' | 'not_found' | 'conflict'> {
  const proposal = await knex('agent_plan_proposals')
    .where({ id: input.proposalId, status: 'completed' })
    .first('result');
  const actions = proposal?.result ? JSON.parse(proposal.result).actions ?? [] : [];
  if (!proposal || input.index < 0 || input.index >= actions.length) {
    return 'not_found';
  }
  const existing = await knex('agent_plan_proposal_actions')
    .where({ proposal_id: input.proposalId, index: input.index })
    .first();
  if (existing) {
    return 'conflict';
  }
  await knex('agent_plan_proposal_actions').insert({
    proposal_id: input.proposalId,
    index: input.index,
    decision: input.decision,
    technical_planning_id: input.technicalPlanningId,
    decided_by: input.decidedBy,
    decided_at: new Date(),
  });
  return 'ok';
}
