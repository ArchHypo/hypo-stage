import { default as React } from 'react';
import { Grid, Button } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useNavigate } from 'react-router-dom';
import { HypothesisList } from '../components/HypothesisList';
import { NotificationProvider } from '../providers/NotificationProvider';

export const HomePage = () => {
  const navigate = useNavigate();

  const handleCreateHypothesis = () => {
    navigate('/hypo-stage/create-hypothesis');
  };

  return (
    <NotificationProvider>
      <Page themeId="tool">
        <Header title="Welcome to Hypo Stage!" subtitle="A usable ArchHypo framework">
          <HeaderLabel label="Owner" value="ArchHypo" />
          <HeaderLabel label="Lifecycle" value="Alpha" />
        </Header>

        <Content>
          <Grid container spacing={3} direction="column">
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateHypothesis}
                size="large"
              >
                Create New Hypothesis
              </Button>
            </Grid>

            <Grid item>
              <HypothesisList />
            </Grid>
          </Grid>
        </Content>
      </Page>
    </NotificationProvider>
  );
};
