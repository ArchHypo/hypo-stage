import { useCallback, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../../api/HypoStageApi';
import { CreateTechnicalPlanningInput, ActionType, LikertScale } from '@archhypo/plugin-hypo-stage-backend';
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
  uncertainty: LikertScale | '';
  impact: LikertScale | '';
}

export const useCreateTechnicalPlanning = (
  hypothesisId: string,
  currentUncertainty?: LikertScale,
  currentImpact?: LikertScale,
) => {
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField, updateFields, resetForm } = useFormState<CreateTechnicalPlanningFormData>({
    entityRef: '',
    actionType: '',
    description: '',
    expectedOutcome: '',
    documentations: [],
    targetDate: '',
    uncertainty: currentUncertainty || '',
    impact: currentImpact || '',
  });

  useEffect(() => {
    updateFields({
      uncertainty: currentUncertainty || '',
      impact: currentImpact || '',
    });
  }, [currentUncertainty, currentImpact, updateFields]);

  const isFormValid = formData.entityRef !== '' &&
    formData.actionType !== '' &&
    formData.description.trim().length > 0 &&
    formData.description.trim().length <= 500 &&
    formData.expectedOutcome.trim().length > 0 &&
    formData.expectedOutcome.trim().length <= 500 &&
    formData.documentations.length > 0 &&
    formData.targetDate !== '';

  const handleSubmit = useCallback(async (onSuccess?: () => void | Promise<void>) => {
    if (!isFormValid) return;

    try {
      const technicalPlanningData: CreateTechnicalPlanningInput = {
        entityRef: formData.entityRef,
        actionType: formData.actionType as ActionType,
        description: formData.description.trim(),
        expectedOutcome: formData.expectedOutcome.trim(),
        documentations: formData.documentations,
        targetDate: formData.targetDate,
        ...(formData.uncertainty && formData.uncertainty !== currentUncertainty ? { uncertainty: formData.uncertainty as LikertScale } : {}),
        ...(formData.impact && formData.impact !== currentImpact ? { impact: formData.impact as LikertScale } : {}),
      };

      await execute(() => api.createTechnicalPlanning(hypothesisId, technicalPlanningData));

      showSuccess('Technical planning added successfully! 🎉');
      resetForm();
      await onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create technical planning');
    }
  }, [hypothesisId, api, formData, isFormValid, execute, showSuccess, showError, resetForm, currentUncertainty, currentImpact]);

  return {
    formData,
    updateField,
    loading,
    isFormValid,
    handleSubmit,
    resetForm
  };
};
