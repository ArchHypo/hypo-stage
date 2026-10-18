import { generateText, Output, type LanguageModel } from 'ai';
import type { z } from 'zod';
import type { RunTraceStep } from '../store/runs';

const CALL_TIMEOUT_MS = 120_000;

/** Structured-output call shared by all pipeline steps; records timing and token usage. */
export async function generateStructured<T>(options: {
  model: LanguageModel;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  step: string;
  trace: RunTraceStep[];
  details?: Record<string, unknown>;
  timeoutMs?: number;
  maxRetries?: number;
}): Promise<T> {
  const started = Date.now();
  const result = await generateText({
    model: options.model,
    system: options.system,
    prompt: options.prompt,
    output: Output.object<T>({ schema: options.schema as any }),
    temperature: 0,
    maxRetries: options.maxRetries ?? 2,
    abortSignal: AbortSignal.timeout(options.timeoutMs ?? CALL_TIMEOUT_MS),
  });
  options.trace.push({
    step: options.step,
    durationMs: Date.now() - started,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    details: options.details,
  });
  return result.output as T;
}

/** Runs async tasks with a concurrency cap, preserving input order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
