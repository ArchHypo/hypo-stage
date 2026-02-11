import { default as React } from 'react';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { EntityRefLinks } from './EntityRefLinks';

describe('EntityRefLinks', () => {
  it('renders "No entity references" when entityRefs is empty', async () => {
    await renderInTestApp(<EntityRefLinks entityRefs={[]} />);
    expect(screen.getByText('No entity references')).toBeInTheDocument();
  });

  it('renders links for valid entity refs with display names', async () => {
    await renderInTestApp(
      <EntityRefLinks
        entityRefs={['component:default/my-service', 'component:default/other']}
      />,
    );
    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('other')).toBeInTheDocument();
    // MUI Chip with component={RouterLink} renders as <a> with role="button"
    const link1 = screen.getByText('my-service').closest('a');
    const link2 = screen.getByText('other').closest('a');
    expect(link1).toHaveAttribute('href', '/catalog/default/component/my-service');
    expect(link2).toHaveAttribute('href', '/catalog/default/component/other');
  });

  it('renders title when provided and not compact', async () => {
    await renderInTestApp(
      <EntityRefLinks
        entityRefs={['component:default/foo']}
        title="Linked components"
      />,
    );
    expect(screen.getByText('Linked components')).toBeInTheDocument();
    expect(screen.getByText('foo')).toBeInTheDocument();
  });

  it('renders in compact mode without title', async () => {
    await renderInTestApp(
      <EntityRefLinks
        entityRefs={['component:default/bar']}
        compact
      />,
    );
    expect(screen.queryByText('Linked components')).not.toBeInTheDocument();
    expect(screen.getByText('bar')).toBeInTheDocument();
  });

  it('skips invalid entity refs and renders valid ones', async () => {
    await renderInTestApp(
      <EntityRefLinks
        entityRefs={['component:default/valid', 'invalid-ref', 'component:default/also-valid']}
      />,
    );
    expect(screen.getByText('valid')).toBeInTheDocument();
    expect(screen.getByText('also-valid')).toBeInTheDocument();
  });
});
