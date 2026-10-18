import type { LanguageModel } from 'ai';
import type { HypothesisRecord } from '../domain/archhypo';
import type { PullRequestDetails } from '../github/client';
import type { RunTraceStep } from '../store/runs';
import type { DiffDigest } from './context';
import { generateStructured } from './llm';
import { buildTriagePrompt, TRIAGE_SYSTEM_PROMPT } from './prompts';
import { TriageOutputSchema } from './schemas';

export const MIN_TRIAGE_RELEVANCE = 0.4;

export interface TriageCandidate {
  hypothesis: HypothesisRecord;
  relevance: number;
  reason: string;
}

/** Step 1: one call over all hypotheses in scope, returns the most relevant ones. */
export async function triage(options: {
  model: LanguageModel;
  pr: PullRequestDetails;
  digest: DiffDigest;
  hypotheses: HypothesisRecord[];
  maxCandidates: number;
  maxInputChars: number;
  trace: RunTraceStep[];
}): Promise<TriageCandidate[]> {
  const output = await generateStructured({
    model: options.model,
    schema: TriageOutputSchema,
    system: TRIAGE_SYSTEM_PROMPT,
    prompt: buildTriagePrompt(options.pr, options.digest, options.hypotheses, options.maxInputChars),
    step: 'triage',
    trace: options.trace,
  });

  const byId = new Map(options.hypotheses.map(h => [h.id, h]));
  const seen = new Set<string>();
  const candidates: TriageCandidate[] = [];
  const dropped: Array<{ id: string; relevance: number; reason: string }> = [];
  for (const c of output.candidates) {
    const id = c.hypothesisId.trim();
    const hypothesis = byId.get(id);
    const drop = (reason: string) => dropped.push({ id, relevance: c.relevance, reason });
    if (!hypothesis) {
      drop('unknown hypothesis id');
    } else if (seen.has(hypothesis.id)) {
      drop('duplicate');
    } else if (!(c.relevance >= MIN_TRIAGE_RELEVANCE)) {
      drop(`relevance below ${MIN_TRIAGE_RELEVANCE}`);
    } else {
      seen.add(hypothesis.id);
      candidates.push({ hypothesis, relevance: Math.min(1, c.relevance), reason: c.reason });
    }
  }
  candidates.sort((a, b) => b.relevance - a.relevance);
  const selected = candidates.slice(0, options.maxCandidates);
  for (const c of candidates.slice(options.maxCandidates)) {
    dropped.push({ id: c.hypothesis.id, relevance: c.relevance, reason: 'over maxCandidates' });
  }

  options.trace[options.trace.length - 1].details = {
    returned: output.candidates.length,
    selected: selected.map(c => ({ id: c.hypothesis.id, relevance: c.relevance, reason: c.reason })),
    dropped,
  };
  return selected;
}
