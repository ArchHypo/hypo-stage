/**
 * ArchHypo focus: classify a hypothesis as "need attention" (high uncertainty + high impact)
 * or "can postpone" (low impact) for prioritization and visibility.
 */

export type HypothesisFocusTag = 'need-attention' | 'can-postpone';

export interface HypothesisFocusInput {
  uncertainty: string;
  impact: string;
}

const highUncertainty = (u: string) => u === 'High' || u === 'Very High';
const highImpact = (i: string) => i === 'High' || i === 'Very High';
const lowImpact = (i: string) => i === 'Very Low' || i === 'Low';

export function hypothesisNeedAttention(h: HypothesisFocusInput): boolean {
  return highUncertainty(h.uncertainty) && highImpact(h.impact);
}

export function hypothesisCanPostpone(h: HypothesisFocusInput): boolean {
  return lowImpact(h.impact);
}

/**
 * Returns the primary focus tag for the hypothesis (need-attention takes precedence).
 */
export function getHypothesisFocusTag(h: HypothesisFocusInput): HypothesisFocusTag | null {
  if (hypothesisNeedAttention(h)) return 'need-attention';
  if (hypothesisCanPostpone(h)) return 'can-postpone';
  return null;
}
