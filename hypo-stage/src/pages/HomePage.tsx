import { default as React, useEffect, useState } from 'react';
import { Grid, Button } from '@material-ui/core';
import {
  Header,
  HeaderTabs,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AGENTS_UNAVAILABLE, AgentsStatus, HypoStageApiRef } from '../api/HypoStageApi';
import { AgentRunsTab } from '../components/AgentRuns/AgentRunsTab';
import { IssuesReportTab } from '../components/IssuesReport/IssuesReportTab';
import { HypothesisList } from '../components/HypothesisList';
import { NotificationProvider } from '../providers/NotificationProvider';

const ALL_TABS = [
  { id: 'hypotheses', label: 'Hypotheses' },
  { id: 'agent-runs', label: 'Agent runs' },
  { id: 'issues-report', label: 'Issues report' },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const api = useApi(HypoStageApiRef);
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<AgentsStatus>(AGENTS_UNAVAILABLE);

  useEffect(() => {
    let cancelled = false;
    api
      .getAgentsStatus()
      .then(status => !cancelled && setAgents(status))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Agent tabs only exist when the agents backend module is installed.
  const tabs = ALL_TABS.filter(
    t =>
      t.id === 'hypotheses' ||
      (t.id === 'agent-runs' && agents.available) ||
      (t.id === 'issues-report' && agents.available && (agents.issues.triage || agents.issues.planIssues)),
  );
  const requested = searchParams.get('tab');
  const selectedIndex = Math.max(0, tabs.findIndex(t => t.id === requested));
  const selectedTab = tabs[selectedIndex].id;

  const handleCreateHypothesis = () => {
    navigate('/hypo-stage/create-hypothesis');
  };

  const selectTab = (index: number) => {
    const next = new URLSearchParams(searchParams);
    if (tabs[index].id === 'hypotheses') {
      next.delete('tab');
    } else {
      next.set('tab', tabs[index].id);
    }
    setSearchParams(next);
  };

  return (
    <NotificationProvider>
      <Page themeId="tool">
        <Header title="Welcome to Hypo Stage!" subtitle="A usable ArchHypo framework">
          <HeaderLabel label="Owner" value="ArchHypo" />
          <HeaderLabel label="Lifecycle" value="Alpha" />
        </Header>
        {tabs.length > 1 && <HeaderTabs tabs={tabs} selectedIndex={selectedIndex} onChange={selectTab} />}

        <Content>
          {selectedTab === 'agent-runs' && <AgentRunsTab enabled={agents.enabled} />}
          {selectedTab === 'issues-report' && <IssuesReportTab />}
          {selectedTab === 'hypotheses' && (
            <Grid container spacing={3} direction="column">
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateHypothesis}
                  size="large"
                  fullWidth
                >
                  Create New Hypothesis
                </Button>
              </Grid>

              <Grid item xs={12} style={{ minWidth: 0, width: '100%' }}>
                <HypothesisList />
              </Grid>
            </Grid>
          )}
        </Content>
      </Page>
    </NotificationProvider>
  );
};
