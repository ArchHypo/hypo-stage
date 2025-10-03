import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useFormState } from '../useFormState';
import { useApiCall } from '../useApiCall';
import { useNotifications } from '../../providers/NotificationProvider';
import { UpdateHypothesisInput, Status, SourceType, QualityAttribute, LikertScale, Hypothesis } from '@internal/plugin-hypo-stage-backend';

export interface EditHypothesisFormData {
  entityRefs: string[];
  status: Status;
  sourceType: SourceType;
  relatedArtefacts: string[];
  qualityAttributes: QualityAttribute[];
  uncertainty: LikertScale;
  impact: LikertScale;
  notes: string;
}

export const useEditHypothesis = (hypothesisId: string | undefined) => {
  const [entityRefs, setEntityRefs] = useState<string[]>([]);
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField, updateFields } = useFormState<EditHypothesisFormData>({
    entityRefs: [],
    status: 'Open',
    sourceType: 'Other',
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'Medium',
    impact: 'Medium',
    notes: '',
  });

  const isFormValid = formData.status &&
    formData.sourceType &&
    formData.qualityAttributes.length > 0;

  const loadEntityRefs = useCallback(async () => {
    const allEntityRefs = await api.getEntityRefs();
    setEntityRefs(allEntityRefs);
  }, [api]);

  const loadHypothesis = useCallback(async () => {
    if (!hypothesisId) return;

    try {
      const hypotheses = await api.getHypotheses();
      const found = hypotheses.find(h => h.id === hypothesisId);

      if (found) {
        setHypothesis(found);
        // Populate form with existing data
        updateFields({
          entityRefs: found.entityRefs,
          status: found.status,
          sourceType: found.sourceType,
          relatedArtefacts: found.relatedArtefacts,
          qualityAttributes: found.qualityAttributes,
          uncertainty: found.uncertainty,
          impact: found.impact,
          notes: found.notes || '',
        });
      } else {
        throw new Error('Hypothesis not found');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load hypothesis');
    }
  }, [hypothesisId, api, updateFields, showError]);

  const handleSubmit = useCallback(async (onSuccess?: () => void) => {
    if (!isFormValid || !hypothesisId) return;

    try {
      const hypothesisData: UpdateHypothesisInput = {
        entityRefs: formData.entityRefs,
        status: formData.status,
        sourceType: formData.sourceType,
        relatedArtefacts: formData.relatedArtefacts,
        qualityAttributes: formData.qualityAttributes,
        uncertainty: formData.uncertainty,
        impact: formData.impact,
        notes: formData.notes.trim() || null,
      };

      await execute(() => api.updateHypothesis(hypothesisId, hypothesisData));

      showSuccess('Hypothesis updated successfully!');
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update hypothesis');
    }
  }, [hypothesisId, api, formData, isFormValid, execute, showSuccess, showError]);

  useEffect(() => {
    loadEntityRefs();
  }, [loadEntityRefs]);

  useEffect(() => {
    loadHypothesis();
  }, [loadHypothesis]);

  return {
    entityRefs,
    hypothesis,
    formData,
    updateField,
    loading,
    isFormValid,
    handleSubmit
  };
};
