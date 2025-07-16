import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { ListHypotheses } from '../components/ListHypotheses';
import { CreateHypothesis } from '../components/CreateHypothesis';

export const HomePage = () => (
  <Page themeId="tool">
    <Header title="Welcome to Hypo Stage!" subtitle="A usable ArchHypo framework">
      <HeaderLabel label="Owner" value="Pedro" />
      <HeaderLabel label="Lifecycle" value="Alpha" />
    </Header>

    <Content>
      <Grid container spacing={3} direction="column">
        <Grid item>
          <CreateHypothesis />
        </Grid>

        <Grid item>
          <ListHypotheses />
        </Grid>
      </Grid>
    </Content>
  </Page>
);
