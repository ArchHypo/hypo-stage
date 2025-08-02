import { Grid } from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
} from '@backstage/core-components';
import { useState, useCallback } from 'react';
import { ListHypotheses } from '../components/ListHypotheses';
import { CreateHypothesis } from '../components/CreateHypothesis';

export const HomePage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleHypothesisCreated = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <Page themeId="tool">
      <Header title="Welcome to Hypo Stage!" subtitle="A usable ArchHypo framework">
        <HeaderLabel label="Owner" value="Pedro" />
        <HeaderLabel label="Lifecycle" value="Alpha" />
      </Header>

      <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <CreateHypothesis onHypothesisCreated={handleHypothesisCreated} />
          </Grid>

          <Grid item>
            <ListHypotheses refreshKey={refreshKey} />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
