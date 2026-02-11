import { default as React } from 'react';
import { Button, Paper, Box, Chip } from '@material-ui/core';
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
import { EntityRefLinks } from '../components/EntityRefLinks';
import { useStyles } from '../hooks/useStyles';
import { getHypothesisFocusTag } from '../utils/hypothesisFocus';
import type { HypothesisFocusTag } from '../utils/hypothesisFocus';

function FocusInfo({
  focusTag,
  className,
}: {
  focusTag: HypothesisFocusTag | null;
  className?: string;
}) {
  const classes = useStyles();
  return (
    <Paper className={className} elevation={0} style={{ marginBottom: 16 }}>
      <Box py={1.5} px={2} display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }}>
        <Box component="span" style={{ fontWeight: 600, marginRight: 8 }}>
          Focus:
        </Box>
        {focusTag === 'need-attention' && (
          <Chip
            size="small"
            label="Needs attention"
            className={`${classes.statusChip} ${classes.focusChipNeedAttention}`}
          />
        )}
        {focusTag === 'can-postpone' && (
          <Chip
            size="small"
            label="Can postpone"
            className={`${classes.statusChip} ${classes.focusChipCanPostpone}`}
          />
        )}
        {focusTag === null && (
          <Chip size="small" label="No focus tag" variant="outlined" className={classes.statusChip} />
        )}
      </Box>
    </Paper>
  );
}

const EditHypothesisPageContent = () => {
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const navigate = useNavigate();
  const classes = useStyles();
  const { hypothesis, formData, updateField, loading, isFormValid, handleSubmit } = useEditHypothesis(hypothesisId);

  if (loading) {
    return <Progress />;
  }

  if (!hypothesis) {
    return <ResponseErrorPanel error={new Error('Hypothesis not found')} />;
  }

  const handleHypothesisUpdated = () => {
    navigate(`/hypo-stage/hypothesis/${hypothesis.id}`);
  };

  const focusTag = getHypothesisFocusTag({
    uncertainty: formData.uncertainty,
    impact: formData.impact,
  });

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
        {hypothesis.entityRefs && hypothesis.entityRefs.length > 0 && (
          <Paper className={classes.paperContainer} elevation={0}>
            <EntityRefLinks entityRefs={hypothesis.entityRefs} title="Linked components" />
          </Paper>
        )}
        <FocusInfo focusTag={focusTag} className={classes.paperContainer} />
        <HypothesisForm
          mode="edit"
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
