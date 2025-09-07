import { Typography, Button, Paper, CircularProgress, Box } from '@material-ui/core';
import Save from '@material-ui/icons/Save';
import ArrowBack from '@material-ui/icons/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useStyles } from '../hooks/useStyles';
import { useEditHypothesis } from '../hooks/forms/useEditHypothesis';
import { NotificationProvider } from '../components/NotificationProvider';
import {
  Header,
  Page,
  Content,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { EditHypothesis } from '../components/EditHypothesis';

const EditHypothesisPageContent = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { hypothesis, formData, updateField, loading, isFormValid, handleSubmit } = useEditHypothesis();

  if (loading) {
    return <Progress />;
  }

  if (!hypothesis) {
    return <ResponseErrorPanel error={new Error('Hypothesis not found')} />;
  }

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
        <Paper className={classes.formContainer} elevation={0}>
          <Typography className={classes.formTitle}>
            <Save />
            Edit Hypothesis
          </Typography>
          <Typography className={classes.formSubtitle}>
            Update your hypothesis and reassess its uncertainty and potential impact
          </Typography>

          <EditHypothesis
            hypothesis={hypothesis}
            formData={formData}
            onFieldChange={updateField}
          />

          {/* Submit Button */}
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
            >
              {loading ? 'Updating...' : 'Update Hypothesis'}
            </Button>
          </Box>
        </Paper>
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
