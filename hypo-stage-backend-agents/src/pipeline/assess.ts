import type { LanguageModel } from 'ai';
import type { HypothesisRecord } from '../domain/archhypo';
import type { PullRequestDetails } from '../github/client';
import type { RunTraceStep } from '../store/runs';
import type { DiffDigest } from './context';
import { generateStructured } from './llm';
import { ASSESS_SYSTEM_PROMPT, buildAssessPrompt } from './prompts';
import { AssessmentOutput, AssessmentOutputSchema } from './schemas';

/** Step 2: detailed assessment of one hypothesis, including its technical plannings. */
export async function assess(options: {
  model: LanguageModel;
  pr: PullRequestDetails;
  digest: DiffDigest;
  hypothesis: HypothesisRecord;
  maxInputChars: number;
  trace: RunTraceStep[];
}): Promise<AssessmentOutput> {
  return generateStructured({
    model: options.model,
    schema: AssessmentOutputSchema,
    system: ASSESS_SYSTEM_PROMPT,
    prompt: buildAssessPrompt(options.pr, options.digest, options.hypothesis, options.maxInputChars),
    step: 'assess',
    trace: options.trace,
    details: { hypothesisId: options.hypothesis.id },
  });
}
