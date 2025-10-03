import { Button } from '@material-ui/core';
import ArrowBack from '@material-ui/icons/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditHypothesis } from '../hooks/forms/useEditHypothesis';
import { NotificationProvider } from '../providers/NotificationProvider';
import {
  Header,
  Page,
  Content,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { HypothesisForm } from '../components/HypothesisForm';

const EditHypothesisPageContent = () => {
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const navigate = useNavigate();
  const { entityRefs, hypothesis, formData, updateField, loading, isFormValid, handleSubmit } = useEditHypothesis(hypothesisId);


  if (loading) {
    return <Progress />;
  }

  if (!hypothesis) {
    return <ResponseErrorPanel error={new Error('Hypothesis not found')} />;
  }

  const handleHypothesisUpdated = () => {
    navigate(`/hypo-stage/hypothesis/${hypothesis.id}`);
  };

  const onSubmit = () => {
    handleSubmit(handleHypothesisUpdated);
  };

  return (
    <Page themeId="tool">
      <Header title="Edit Hypothesis" subtitle={`ID: ${hypothesis.id}`}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/hypo-stage/hypothesis/${hypothesis.id}`)}
        >
          Back to Hypothesis
        </Button>
      </Header>

      <Content>
        <HypothesisForm
          mode="edit"
          entityRefs={entityRefs}
          hypothesis={hypothesis}
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

export const EditHypothesisPage = () => {
  return (
    <NotificationProvider>
      <EditHypothesisPageContent />
    </NotificationProvider>
  );
};
