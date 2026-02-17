import { default as React } from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import { RelatedArtefactsCard } from './RelatedArtefactsCard';

const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createHypothesis = (overrides: Partial<{ relatedArtefacts: string[] }> = {}) => ({
  id: 'test-id',
  statement: 'Test statement',
  status: 'Open' as const,
  sourceType: 'Requirement' as const,
  entityRefs: [],
  relatedArtefacts: [] as string[],
  qualityAttributes: [],
  uncertainty: 'Medium' as const,
  impact: 'High' as const,
  technicalPlannings: [],
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('RelatedArtefactsCard', () => {
  it('should render card title', () => {
    const hypothesis = createHypothesis();
    renderWithTheme(<RelatedArtefactsCard hypothesis={hypothesis} />);

    expect(screen.getByText('Related Artefacts')).toBeInTheDocument();
  });

  it('should show "No related artefacts" when empty', () => {
    const hypothesis = createHypothesis();
    renderWithTheme(<RelatedArtefactsCard hypothesis={hypothesis} />);

    expect(screen.getByText('No related artefacts')).toBeInTheDocument();
  });

  it('should render related artefacts as clickable links with proper attributes', () => {
    const urls = [
      'https://example.com/doc1',
      'https://very-long-domain.example.com/path/to/artefact',
    ];
    const hypothesis = createHypothesis({ relatedArtefacts: urls });
    renderWithTheme(<RelatedArtefactsCard hypothesis={hypothesis} />);

    const link1 = screen.getByRole('link', { name: urls[0] });
    const link2 = screen.getByRole('link', { name: urls[1] });

    expect(link1).toHaveAttribute('href', urls[0]);
    expect(link1).toHaveAttribute('target', '_blank');
    expect(link1).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link2).toHaveAttribute('href', urls[1]);
    expect(link2).toHaveAttribute('target', '_blank');
  });

  it('should render list items with word-break for long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/to/artefact';
    const hypothesis = createHypothesis({ relatedArtefacts: [longUrl] });
    renderWithTheme(<RelatedArtefactsCard hypothesis={hypothesis} />);

    const link = screen.getByRole('link', { name: longUrl });
    expect(link).toBeInTheDocument();
    expect(link.closest('li')).toBeInTheDocument();
  });
});
