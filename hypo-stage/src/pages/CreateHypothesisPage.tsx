import React from 'react';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useNavigate } from 'react-router-dom';
import { HypothesisForm } from '../components/HypothesisForm';
import { useCreateHypothesis } from '../hooks/forms/useCreateHypothesis';
import { NotificationProvider } from '../providers/NotificationProvider';

const CreateHypothesisPageContent = () => {
  const navigate = useNavigate();
  const { entityRefs, formData, updateField, loading, isFormValid, handleSubmit } = useCreateHypothesis();

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
          entityRefs={entityRefs}
          formData={formData}
          onFieldChange={updateField}
          isFormValid={isFormValid}
          loading={loading}
          onSubmit={onSubmit}
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
