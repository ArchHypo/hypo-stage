import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useNavigate } from 'react-router-dom';
import { CreateHypothesis } from '../components/CreateHypothesis';
import { NotificationProvider } from '../components/NotificationProvider';

export const CreateHypothesisPage = () => {
  const navigate = useNavigate();

  const handleHypothesisCreated = () => {
    navigate('/hypo-stage');
  };

  return (
    <NotificationProvider>
      <Page themeId="tool">
        <Header title="Create New Hypothesis" subtitle="Add a new hypothesis to the system">
          <HeaderLabel label="Owner" value="Pedro" />
          <HeaderLabel label="Lifecycle" value="Alpha" />
        </Header>

        <Content>
          <Grid container spacing={3} direction="column">
            <Grid item>
              <CreateHypothesis onHypothesisCreated={handleHypothesisCreated} />
            </Grid>
          </Grid>
        </Content>
      </Page>
    </NotificationProvider>
  );
};
