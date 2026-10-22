import { default as React, useEffect } from 'react';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { QualityAttribute } from '@archhypo/plugin-hypo-stage-backend';
import { QUALITY_ATTRIBUTE_OPTIONS } from '../utils/constants';
import { HypothesisForm } from '../components/HypothesisForm';
import { useCreateHypothesis } from '../hooks/forms/useCreateHypothesis';
import { useHypothesisCoach } from '../hooks/useHypothesisCoach';
import { NotificationProvider } from '../providers/NotificationProvider';

const CreateHypothesisPageContent = () => {
  const navigate = useNavigate();
  const { formData, updateField, updateFields, loading, isFormValid, handleSubmit } = useCreateHypothesis();
  const [searchParams] = useSearchParams();

  // Pre-fill from links such as the Issues report's "Create hypothesis" (coverage findings).
  useEffect(() => {
    const statement = searchParams.get('statement');
    if (!statement) return;
    const validAttributes = new Set(QUALITY_ATTRIBUTE_OPTIONS.map(o => o.value));
    updateFields({
      statement: statement.slice(0, 500),
      entityRefs: searchParams.getAll('entityRef'),
      qualityAttributes: searchParams
        .getAll('qualityAttribute')
        .filter((qa): qa is QualityAttribute => validAttributes.has(qa as QualityAttribute)),
      notes: searchParams.get('notes') ?? '',
    });
    // Only on first render: later edits belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const coach = useHypothesisCoach();

  const handleHypothesisCreated = () => {
    navigate('/hypo-stage');
  };

  const onSubmit = () => {
    handleSubmit(handleHypothesisCreated);
  };

  return (
    <Page themeId="tool">
      <Header title="Create New Hypothesis" subtitle="Add a new hypothesis to the system">
        <HeaderLabel label="Owner" value="Pedro" />
        <HeaderLabel label="Lifecycle" value="Alpha" />
      </Header>

      <Content>
        <HypothesisForm
          mode="create"
          formData={formData}
          onFieldChange={updateField}
          isFormValid={isFormValid}
          loading={loading}
          onSubmit={onSubmit}
          coach={coach}
        />
      </Content>
    </Page>
  );
};

export const CreateHypothesisPage = () => {
  return (
    <NotificationProvider>
      <CreateHypothesisPageContent />
    </NotificationProvider>
  );
};
