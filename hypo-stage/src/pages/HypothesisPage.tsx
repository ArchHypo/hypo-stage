import { Button, Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useHypothesisData } from '../hooks/useHypothesisData';
import { formatDate } from '../utils/formatters';
import { HypothesisDetails } from './HypothesisPage/components/HypothesisDetails';
import { QualityAttributesCard } from './HypothesisPage/components/QualityAttributesCard';
import { RelatedArtefactsCard } from './HypothesisPage/components/RelatedArtefactsCard';
import { TechnicalPlanningList } from '../components/TechnicalPlanningList';
import { EvolutionChart } from './HypothesisPage/components/EvolutionChart';
import { NotificationProvider } from '../providers/NotificationProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useStyles } from '../hooks/useStyles';
import ArrowBack from '@material-ui/icons/ArrowBack';
import Edit from '@material-ui/icons/Edit';

export const HypothesisPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const { hypothesis, events, loading, error, refreshHypothesis } = useHypothesisData(hypothesisId);

  if (loading) {
    return <Progress />;
  }

  if (error || !hypothesis) {
    return <ResponseErrorPanel error={error || new Error('Hypothesis not found')} />;
  }

  return (
    <NotificationProvider>
      <Page themeId="tool">
        <Header title="Hypothesis Dashboard" subtitle={`ID: ${hypothesis.id}`}>
          <HeaderLabel label="Status" value={hypothesis.status} />
          <HeaderLabel label="Created" value={formatDate(hypothesis.createdAt)} />
          <HeaderLabel label="Updated" value={formatDate(hypothesis.updatedAt)} />
        </Header>

        <Content>
          <div className={classes.marginBottom}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/hypo-stage')}
              className={classes.marginRight}
            >
              Back to List
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              onClick={() => navigate(`/hypo-stage/hypothesis/${hypothesis.id}/edit`)}
            >
              Edit Hypothesis
            </Button>
          </div>

          <Grid container spacing={3}>
            {/* Main Hypothesis Information */}
            <Grid item xs={12} md={8}>
              <HypothesisDetails hypothesis={hypothesis} />
            </Grid>

            {/* Sidebar Information - Full Width */}
            <Grid item xs={12} md={4}>
              <QualityAttributesCard hypothesis={hypothesis} />
            </Grid>

            <Grid item xs={12}>
              <RelatedArtefactsCard hypothesis={hypothesis} />
            </Grid>

            {/* Evolution Chart Section */}
            <Grid item xs={12}>
              <EvolutionChart hypothesis={hypothesis} events={events} />
            </Grid>

            {/* Technical Planning Section */}
            <Grid item xs={12}>
              <TechnicalPlanningList hypothesis={hypothesis} onRefresh={refreshHypothesis} />
            </Grid>
          </Grid>
        </Content>
      </Page>
    </NotificationProvider>
  );
};
