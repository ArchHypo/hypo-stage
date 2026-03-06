import { useCallback, useEffect, useRef } from 'react';
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

export const useEditTechnicalPlanning = (
  technicalPlanning: TechnicalPlanning,
  currentUncertainty?: LikertScale,
  currentImpact?: LikertScale,
) => {
  const api = useApi(HypoStageApiRef);
  const { loading, execute } = useApiCall();
  const { showSuccess, showError } = useNotifications();
  const { formData, updateField, updateFields } = useFormState<EditTechnicalPlanningFormData>({
    expectedOutcome: technicalPlanning.expectedOutcome,
    documentations: technicalPlanning.documentations,
    uncertainty: currentUncertainty || '',
    impact: currentImpact || '',
  });

  const dirtyFields = useRef<Set<string>>(new Set());
  const latestUncertainty = useRef(currentUncertainty);
  const latestImpact = useRef(currentImpact);
  latestUncertainty.current = currentUncertainty;
  latestImpact.current = currentImpact;

  const wrappedUpdateField = useCallback((field: keyof EditTechnicalPlanningFormData, value: any) => {
    if (field === 'uncertainty' || field === 'impact') {
      dirtyFields.current.add(field);
    }
    updateField(field, value);
  }, [updateField]);

  useEffect(() => {
    const updates: Partial<EditTechnicalPlanningFormData> = {};
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

  const isFormValid = formData.expectedOutcome.trim().length > 0 &&
    formData.expectedOutcome.trim().length <= 500 &&
    formData.documentations.length > 0;

  const handleSubmit = useCallback(async (
    planningId: string,
    onSuccess?: () => void | Promise<void>,
  ) => {
    if (!isFormValid) return;

    try {
      const technicalPlanningData: UpdateTechnicalPlanningInput = {
        expectedOutcome: formData.expectedOutcome.trim(),
        documentations: formData.documentations,
        ...(formData.uncertainty && formData.uncertainty !== latestUncertainty.current ? { uncertainty: formData.uncertainty as LikertScale } : {}),
        ...(formData.impact && formData.impact !== latestImpact.current ? { impact: formData.impact as LikertScale } : {}),
      };

      await execute(() => api.updateTechnicalPlanning(planningId, technicalPlanningData));

      showSuccess('Technical planning updated successfully!');
      await onSuccess?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update technical planning');
    }
  }, [api, formData, isFormValid, execute, showSuccess, showError]);

  return {
    formData,
    updateField: wrappedUpdateField,
    loading,
    isFormValid,
    handleSubmit
  };
};
