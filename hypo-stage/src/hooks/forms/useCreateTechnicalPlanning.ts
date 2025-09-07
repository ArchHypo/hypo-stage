import { useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { CreateTechnicalPlanningInput, ActionType } from '@internal/plugin-hypo-stage-backend';
import { useFormState } from '../useFormState';
import { useApiCall } from '../useApiCall';
import { useNotifications } from '../../providers/NotificationProvider';

export interface CreateTechnicalPlanningFormData {
  entityRef: string;
  actionType: ActionType | '';
  description: string;
  expectedOutcome: string;
  documentations: string[];
  targetDate: string;
}

export const useCreateTechnicalPlanning = (hypothesisId: string) => {
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField, resetForm } = useFormState<CreateTechnicalPlanningFormData>({
    entityRef: '',
    actionType: '',
    description: '',
    expectedOutcome: '',
    documentations: [],
    targetDate: '',
  });

  const isFormValid = formData.entityRef !== '' &&
    formData.actionType !== '' &&
    formData.description.trim().length > 0 &&
    formData.description.trim().length <= 500 &&
    formData.expectedOutcome.trim().length > 0 &&
    formData.expectedOutcome.trim().length <= 500 &&
    formData.documentations.length > 0 &&
    formData.targetDate !== '';

  const handleSubmit = useCallback(async (onSuccess?: () => void) => {
    if (!isFormValid) return;

    try {
      const technicalPlanningData: CreateTechnicalPlanningInput = {
        entityRef: formData.entityRef,
        actionType: formData.actionType as ActionType,
        description: formData.description.trim(),
        expectedOutcome: formData.expectedOutcome.trim(),
        documentations: formData.documentations,
        targetDate: formData.targetDate,
      };

      await execute(() => api.createTechnicalPlanning(hypothesisId, technicalPlanningData));

      showSuccess('Technical planning added successfully! 🎉');
      resetForm();
      onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create technical planning');
    }
  }, [hypothesisId, api, formData, isFormValid, execute, showSuccess, showError, resetForm]);

  return {
    formData,
    updateField,
    loading,
    isFormValid,
    handleSubmit,
    resetForm
  };
};
