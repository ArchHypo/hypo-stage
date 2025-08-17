import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useNavigate } from 'react-router-dom';
import { CreateHypothesis } from '../components/CreateHypothesis';

export const CreateHypothesisPage = () => {
  const navigate = useNavigate();

  const handleHypothesisCreated = () => {
    // Navigate back to home page after successful creation
    navigate('/hypo-stage');
  };

  return (
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
  );
};
