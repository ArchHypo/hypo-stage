import { useCallback, useEffect, useRef } from 'react';
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

  const dirtyFields = useRef<Set<string>>(new Set());
  const latestUncertainty = useRef(currentUncertainty);
  const latestImpact = useRef(currentImpact);
  latestUncertainty.current = currentUncertainty;
  latestImpact.current = currentImpact;

  const wrappedUpdateField = useCallback((field: keyof CreateTechnicalPlanningFormData, value: any) => {
    if (field === 'uncertainty' || field === 'impact') {
      dirtyFields.current.add(field);
    }
    updateField(field, value);
  }, [updateField]);

  useEffect(() => {
    const updates: Partial<CreateTechnicalPlanningFormData> = {};
    if (!dirtyFields.current.has('uncertainty')) {
      updates.uncertainty = currentUncertainty || '';
    }
    if (!dirtyFields.current.has('impact')) {
      updates.impact = currentImpact || '';
    }
    if (Object.keys(updates).length > 0) {
      updateFields(updates);
    }
  }, [currentUncertainty, currentImpact, updateFields]);

  const isFormValid = formData.entityRef !== '' &&
    formData.actionType !== '' &&
    formData.description.trim().length > 0 &&
    formData.description.trim().length <= 500 &&
    formData.expectedOutcome.trim().length > 0 &&
    formData.expectedOutcome.trim().length <= 500 &&
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
        ...(formData.uncertainty && formData.uncertainty !== latestUncertainty.current ? { uncertainty: formData.uncertainty as LikertScale } : {}),
        ...(formData.impact && formData.impact !== latestImpact.current ? { impact: formData.impact as LikertScale } : {}),
      };

      await execute(() => api.createTechnicalPlanning(hypothesisId, technicalPlanningData));

      showSuccess('Technical planning added successfully! 🎉');
      dirtyFields.current.clear();
      resetForm();
      await onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create technical planning');
    }
  }, [hypothesisId, api, formData, isFormValid, execute, showSuccess, showError, resetForm]);

  const wrappedResetForm = useCallback(() => {
    dirtyFields.current.clear();
    resetForm();
  }, [resetForm]);

  return {
    formData,
    updateField: wrappedUpdateField,
    loading,
    isFormValid,
    handleSubmit,
    resetForm: wrappedResetForm
  };
};
