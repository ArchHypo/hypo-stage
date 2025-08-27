import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  makeStyles,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Divider,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import Assessment from '@material-ui/icons/Assessment';
import Timeline from '@material-ui/icons/Timeline';
import Description from '@material-ui/icons/Description';
import Link from '@material-ui/icons/Link';
import Notes from '@material-ui/icons/Notes';
import ArrowBack from '@material-ui/icons/ArrowBack';
import Edit from '@material-ui/icons/Edit';
import { Hypothesis, HypothesisEvent } from '@internal/plugin-hypo-stage-backend';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  statusChip: {
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusInProgress: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusValidated: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusPlanning: {
    backgroundColor: '#cce5ff',
    color: '#004085',
  },
  statusTesting: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusCompleted: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  statusResearch: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  statusOpen: {
    backgroundColor: '#cce5ff',
    color: '#004085',
  },
  statusInReview: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusDiscarded: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusTriggerFired: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  statusOther: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  uncertaintyVeryHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  uncertaintyHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  uncertaintyMedium: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  uncertaintyLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  uncertaintyVeryLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  impactVeryHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontWeight: 'bold',
  },
  impactHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontWeight: 'bold',
  },
  impactMedium: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  impactLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  impactVeryLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  sectionTitle: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  actionButtons: {
    marginBottom: theme.spacing(3),
  },
  technicalPlanningSection: {
    marginTop: theme.spacing(3),
  },
  qualityAttributesList: {
    marginTop: theme.spacing(2),
  },
  relatedArtefactsList: {
    marginTop: theme.spacing(2),
  },
  chartContainer: {
    height: 400,
    marginTop: theme.spacing(2),
  },
  chartCard: {
    marginTop: theme.spacing(3),
  },
}));

export const HypothesisPage = () => {
  const classes = useStyles();
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const navigate = useNavigate();
  const hypoStageApi = useApi(HypoStageApiRef);
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [events, setEvents] = useState<HypothesisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch hypothesis
        const hypotheses = await hypoStageApi.getHypotheses();
        const found = hypotheses.find(h => h.id === hypothesisId);
        if (found) {
          setHypothesis(found);
          // Fetch events for the hypothesis
          try {
            if (hypothesisId) {
              const hypothesisEvents = await hypoStageApi.getEvents(hypothesisId);
              setEvents(hypothesisEvents);
            }
          } catch (eventErr) {
            setEvents([]);
          }
        } else {
          navigate('/hypo-stage');
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (hypothesisId) {
      fetchData();
    }
  }, [hypothesisId, hypoStageApi, navigate]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Open':
        return classes.statusOpen;
      case 'In Review':
        return classes.statusInReview;
      case 'Validated':
        return classes.statusValidated;
      case 'Discarded':
        return classes.statusDiscarded;
      case 'Trigger-Fired':
        return classes.statusTriggerFired;
      case 'Other':
        return classes.statusOther;
      default:
        return classes.statusInProgress;
    }
  };

  const getUncertaintyClass = (uncertainty: string) => {
    switch (uncertainty) {
      case 'Very High':
        return classes.uncertaintyVeryHigh;
      case 'High':
        return classes.uncertaintyHigh;
      case 'Medium':
        return classes.uncertaintyMedium;
      case 'Low':
        return classes.uncertaintyLow;
      case 'Very Low':
        return classes.uncertaintyVeryLow;
      default:
        return classes.uncertaintyMedium;
    }
  };

  const getImpactClass = (impact: string) => {
    switch (impact) {
      case 'Very High':
        return classes.impactVeryHigh;
      case 'High':
        return classes.impactHigh;
      case 'Medium':
        return classes.impactMedium;
      case 'Low':
        return classes.impactLow;
      case 'Very Low':
        return classes.impactVeryLow;
      default:
        return classes.impactMedium;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUncertaintyValue = (uncertainty: string) => {
    switch (uncertainty) {
      case 'Very High': return 5;
      case 'High': return 4;
      case 'Medium': return 3;
      case 'Low': return 2;
      case 'Very Low': return 1;
      default: return 3;
    }
  };

  const getImpactValue = (impact: string) => {
    switch (impact) {
      case 'Very High': return 5;
      case 'High': return 4;
      case 'Medium': return 3;
      case 'Low': return 2;
      case 'Very Low': return 1;
      default: return 3;
    }
  };

  const getValueLabel = (value: number) => {
    switch (value) {
      case 1: return 'Muito Baixo';
      case 2: return 'Baixo';
      case 3: return 'Médio';
      case 4: return 'Alto';
      case 5: return 'Muito Alto';
      default: return value.toString();
    }
  };

  const prepareChartData = () => {
    if (!hypothesis || events.length === 0) return [];

    const chartData: {
      timestamp: string;
      uncertainty: number | undefined;
      impact: number | undefined;
    }[] = [];

    // Add values from events
    events.forEach(event => {
        const hasUncertainty = event.changes.uncertainty;
        const hasImpact = event.changes.impact;
        chartData.push({
          timestamp: new Date(event.timestamp).toLocaleDateString('pt-BR'),
          uncertainty: hasUncertainty ? getUncertaintyValue(event.changes.uncertainty) : undefined,
          impact: hasImpact ? getImpactValue(event.changes.impact) : undefined,
        });
    });

    return chartData;
  };

  if (loading) {
    return <Progress />;
  }

  if (error || !hypothesis) {
    return <ResponseErrorPanel error={error || new Error('Hypothesis not found')} />;
  }

  return (
    <Page themeId="tool">
      <Header title="Hypothesis Dashboard" subtitle={`ID: ${hypothesis.id}`}>
        <HeaderLabel label="Status" value={hypothesis.status} />
        <HeaderLabel label="Created" value={formatDate(hypothesis.createdAt)} />
        <HeaderLabel label="Updated" value={formatDate(hypothesis.updatedAt)} />
      </Header>

      <Content>
        <div className={classes.actionButtons}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/hypo-stage')}
            style={{ marginRight: 16 }}
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
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" className={classes.sectionTitle}>
                  <Description />
                  Hypothesis Statement
                </Typography>
                <Typography variant="body1" paragraph>
                  {hypothesis.statement}
                </Typography>

                <Divider style={{ margin: '24px 0' }} />

                <Typography variant="h6" className={classes.sectionTitle}>
                  <Assessment />
                  Assessment
                </Typography>
                <Box display="flex" flexWrap="wrap" style={{ marginBottom: 16 }}>
                  <Chip
                    label={`Uncertainty: ${hypothesis.uncertainty}`}
                    className={`${classes.statusChip} ${getUncertaintyClass(hypothesis.uncertainty)}`}
                    style={{ margin: '0 8px 8px 0' }}
                  />
                  <Chip
                    label={`Impact: ${hypothesis.impact}`}
                    className={`${classes.statusChip} ${getImpactClass(hypothesis.impact)}`}
                    style={{ margin: '0 8px 8px 0' }}
                  />
                  <Chip
                    label={`Status: ${hypothesis.status}`}
                    className={`${classes.statusChip} ${getStatusClass(hypothesis.status)}`}
                    style={{ margin: '0 8px 8px 0' }}
                  />
                </Box>

                <Typography variant="h6" className={classes.sectionTitle}>
                  <Link />
                  Source Information
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Source Type: {hypothesis.sourceType}
                </Typography>

                {hypothesis.notes && (
                  <>
                    <Divider style={{ margin: '24px 0' }} />
                    <Typography variant="h6" className={classes.sectionTitle}>
                      <Notes />
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {hypothesis.notes}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar Information */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              {/* Quality Attributes */}
              <Grid item xs={12}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography variant="h6" className={classes.sectionTitle}>
                      <Assessment />
                      Quality Attributes
                    </Typography>
                    {hypothesis.qualityAttributes.length > 0 ? (
                      <List dense>
                        {hypothesis.qualityAttributes.map((attr: string, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Assessment fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={attr}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No quality attributes defined
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Related Artefacts */}
              <Grid item xs={12}>
                <Card className={classes.card}>
                  <CardContent>
                    <Typography variant="h6" className={classes.sectionTitle}>
                      <Link />
                      Related Artefacts
                    </Typography>
                    {hypothesis.relatedArtefacts.length > 0 ? (
                      <List dense>
                        {hypothesis.relatedArtefacts.map((artefact: string, index: number) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Link fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={artefact} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No related artefacts
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Technical Planning Section */}
          <Grid item xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Typography variant="h5" className={classes.sectionTitle}>
                  <Timeline />
                  Technical Planning
                </Typography>

                {hypothesis.technicalPlanning ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Action Type
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {hypothesis.technicalPlanning.actionType}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Target Date
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {hypothesis.technicalPlanning.targetDate}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Description
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {hypothesis.technicalPlanning.description}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Expected Outcome
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {hypothesis.technicalPlanning.expectedOutcome}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Entity Reference
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {hypothesis.technicalPlanning.entityRef}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper variant="outlined" style={{ padding: 16 }}>
                        <Typography variant="h6" gutterBottom>
                          Documentation
                        </Typography>
                        <Typography variant="body2" paragraph>
                          <a href={hypothesis.technicalPlanning.documentation} target="_blank" rel="noopener noreferrer">
                            {hypothesis.technicalPlanning.documentation}
                          </a>
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No technical planning information available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Evolution Chart Section */}
          <Grid item xs={12}>
            <Card className={`${classes.card} ${classes.chartCard}`}>
              <CardContent>
                <Typography variant="h5" className={classes.sectionTitle}>
                  <Assessment />
                  Evolução da Incerteza e Impacto
                </Typography>

                {events.length > 0 ? (
                  <div className={classes.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prepareChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          domain={[1, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          tickFormatter={getValueLabel}
                        />
                        <Legend
                          formatter={(value) => value === 'uncertainty' ? 'Incerteza' : 'Impacto'}
                        />
                        <Line
                          type="monotone"
                          dataKey="uncertainty"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="impact"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum evento encontrado para mostrar a evolução
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
