import { useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { Hypothesis, UpdateHypothesisInput } from '@archhypo/plugin-hypo-stage-backend';
import { AgentSuggestion, HypoStageApi, HypoStageApiRef } from '../api/HypoStageApi';

const toUpdateInput = (hypothesis: Hypothesis): UpdateHypothesisInput => ({
  entityRefs: hypothesis.entityRefs,
  statement: hypothesis.statement,
  status: hypothesis.status,
  sourceType: hypothesis.sourceType,
  relatedArtefacts: hypothesis.relatedArtefacts,
  qualityAttributes: hypothesis.qualityAttributes,
  notes: hypothesis.notes,
});

const withUrl = (urls: string[], url: string) => (urls.includes(url) ? urls : [...urls, url]);

const findPlanning = (hypothesis: Hypothesis, id: string | null) => {
  const planning = hypothesis.technicalPlannings.find(tp => tp.id === id);
  if (!planning) {
    throw new Error('The technical planning targeted by this suggestion no longer exists');
  }
  return planning;
};

/**
 * Applies a suggestion through the regular hypo-stage endpoints, so the change is validated
 * and recorded in the hypothesis evolution like a manual edit. Each step is idempotent, which
 * makes retrying safe if marking the suggestion as accepted fails.
 */
export async function applyAgentSuggestion(
  api: HypoStageApi,
  hypothesis: Hypothesis,
  suggestion: AgentSuggestion,
): Promise<void> {
  if (suggestion.kind === 'evidence_alert') {
    // Informational: acknowledging it changes nothing; the team reassesses the hypothesis itself.
    return;
  }

  if (suggestion.kind === 'rewrite') {
    // Coach suggestion: no pull request involved.
    const { statement, sourceType, addQualityAttributes } = suggestion.payload;
    const qualityAttributes = Array.from(
      new Set([...hypothesis.qualityAttributes, ...(addQualityAttributes ?? [])]),
    );
    const unchanged =
      hypothesis.statement === statement &&
      (!sourceType || hypothesis.sourceType === sourceType) &&
      qualityAttributes.length === hypothesis.qualityAttributes.length;
    if (!unchanged) {
      await api.updateHypothesis(hypothesis.id, {
        ...toUpdateInput(hypothesis),
        statement,
        sourceType: sourceType ?? hypothesis.sourceType,
        qualityAttributes,
      });
    }
    return;
  }

  const url = suggestion.artifactUrl;
  if (!url) {
    throw new Error('This suggestion has no pull request URL to record');
  }

  switch (suggestion.kind) {
    case 'link':
      if (!hypothesis.relatedArtefacts.includes(url)) {
        await api.updateHypothesis(hypothesis.id, {
          ...toUpdateInput(hypothesis),
          relatedArtefacts: withUrl(hypothesis.relatedArtefacts, url),
        });
      }
      break;

    case 'planning_progress': {
      const planning = findPlanning(hypothesis, suggestion.technicalPlanningId);
      await api.updateTechnicalPlanning(planning.id, {
        expectedOutcome: suggestion.payload.expectedOutcome ?? planning.expectedOutcome,
        documentations: withUrl(planning.documentations, url),
      });
      break;
    }

    case 'reassessment': {
      // Uncertainty and impact change through the planning, which records a
      // TECHNICAL_PLANNING_UPDATE event on the evolution chart.
      const planning = findPlanning(hypothesis, suggestion.technicalPlanningId);
      await api.updateTechnicalPlanning(planning.id, {
        expectedOutcome: planning.expectedOutcome,
        documentations: withUrl(planning.documentations, url),
        uncertainty: suggestion.payload.uncertainty,
        impact: suggestion.payload.impact,
      });
      break;
    }

    case 'new_planning': {
      const { actionType, entityRef, description, expectedOutcome, targetDate, uncertainty, impact } =
        suggestion.payload;
      const alreadyCreated = hypothesis.technicalPlannings.some(
        tp => tp.description === description && tp.documentations.includes(url),
      );
      if (!alreadyCreated) {
        await api.createTechnicalPlanning(hypothesis.id, {
          entityRef,
          actionType,
          description,
          expectedOutcome,
          documentations: [url],
          targetDate,
          ...(uncertainty ? { uncertainty } : {}),
          ...(impact ? { impact } : {}),
        });
      }
      break;
    }

    case 'status_change':
      if (hypothesis.status !== suggestion.payload.status) {
        await api.updateHypothesis(hypothesis.id, {
          ...toUpdateInput(hypothesis),
          status: suggestion.payload.status,
        });
      }
      break;

    default:
      throw new Error(`Unsupported suggestion kind: ${(suggestion as AgentSuggestion).kind}`);
  }
}

export const useApplyAgentSuggestion = () => {
  const api = useApi(HypoStageApiRef);

  const accept = useCallback(
    async (hypothesis: Hypothesis, suggestion: AgentSuggestion) => {
      await applyAgentSuggestion(api, hypothesis, suggestion);
      // Recorded after applying: the backend may then close the plan issue of a completed planning.
      return api.reviewAgentSuggestion(suggestion.id, 'accepted');
    },
    [api],
  );

  const reject = useCallback(
    async (suggestion: AgentSuggestion) => {
      await api.reviewAgentSuggestion(suggestion.id, 'rejected');
    },
    [api],
  );

  return { accept, reject };
};
