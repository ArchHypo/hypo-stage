import { useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { useFormState } from '../useFormState';
import { useApiCall } from '../useApiCall';
import { useNotifications } from '../../providers/NotificationProvider';
import { UpdateTechnicalPlanningInput, TechnicalPlanning, LikertScale } from '@archhypo/plugin-hypo-stage-backend';

export interface EditTechnicalPlanningFormData {
  expectedOutcome: string;
  documentations: string[];
  uncertainty: LikertScale | '';
  impact: LikertScale | '';
}

export const useEditTechnicalPlanning = (technicalPlanning: TechnicalPlanning) => {
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField } = useFormState<EditTechnicalPlanningFormData>({
    expectedOutcome: technicalPlanning.expectedOutcome,
    documentations: technicalPlanning.documentations,
    uncertainty: '',
    impact: '',
  });

  const isFormValid = formData.expectedOutcome.trim().length > 0 &&
    formData.expectedOutcome.trim().length <= 500 &&
    formData.documentations.length > 0;

  const handleSubmit = useCallback(async (onSuccess?: () => void) => {
    if (!isFormValid) return;

    try {
      const technicalPlanningData: UpdateTechnicalPlanningInput = {
        expectedOutcome: formData.expectedOutcome.trim(),
        documentations: formData.documentations,
        ...(formData.uncertainty ? { uncertainty: formData.uncertainty as LikertScale } : {}),
        ...(formData.impact ? { impact: formData.impact as LikertScale } : {}),
      };

      await execute(() => api.updateTechnicalPlanning(technicalPlanning.id, technicalPlanningData));

      showSuccess('Technical planning updated successfully!');
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update technical planning');
    }
  }, [technicalPlanning.id, api, formData, isFormValid, execute, showSuccess, showError]);

  return {
    formData,
    updateField,
    loading,
    isFormValid,
    handleSubmit
  };
};
