import { useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { CreateHypothesisInput, SourceType, QualityAttribute, LikertScale } from '@internal/plugin-hypo-stage-backend';
import { useFormState } from '../useFormState';
import { useApiCall } from '../useApiCall';
import { useNotifications } from '../../components/NotificationProvider';

interface CreateHypothesisFormData {
  entityRefs: string[];
  statement: string;
  sourceType: SourceType | '';
  relatedArtefacts: string[];
  qualityAttributes: QualityAttribute[];
  uncertainty: LikertScale | '';
  impact: LikertScale | '';
  notes: string;
}

export const useCreateHypothesis = () => {
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField, resetForm } = useFormState<CreateHypothesisFormData>({
    entityRefs: [],
    statement: '',
    sourceType: '',
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: '',
    impact: '',
    notes: '',
  });

  const isFormValid = formData.entityRefs.length > 0 &&
    formData.statement.trim().length >= 20 &&
    formData.statement.trim().length <= 500 &&
    formData.sourceType &&
    formData.qualityAttributes.length > 0 &&
    formData.uncertainty !== '' &&
    formData.impact !== '';

  const handleSubmit = useCallback(async (onSuccess?: () => void) => {
    if (!isFormValid) return;

    try {
      const hypothesisData: CreateHypothesisInput = {
        entityRefs: formData.entityRefs,
        statement: formData.statement.trim(),
        sourceType: formData.sourceType as SourceType,
        relatedArtefacts: formData.relatedArtefacts,
        qualityAttributes: formData.qualityAttributes,
        uncertainty: formData.uncertainty as LikertScale,
        impact: formData.impact as LikertScale,
        notes: formData.notes.trim() || null,
      };

      await execute(() => api.createHypothesis(hypothesisData));

      showSuccess('Hypothesis submitted successfully! 🎉');
      resetForm();
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create hypothesis');
    }
  }, [api, formData, isFormValid, execute, showSuccess, showError, resetForm]);

  return {
    formData,
    updateField,
    loading,
    isFormValid,
    handleSubmit,
    resetForm
  };
};
