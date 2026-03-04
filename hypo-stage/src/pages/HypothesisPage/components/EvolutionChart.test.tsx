import { default as React } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import { EvolutionChart } from './EvolutionChart';
import { Hypothesis, HypothesisEvent } from '@archhypo/plugin-hypo-stage-backend';

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

jest.mock('../../../hooks/useStyles', () => ({
  useStyles: () => ({
    chartContainer: 'mock-chart-container',
  }),
}));

const theme = createTheme();

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createMockHypothesis = (overrides: Partial<Hypothesis> = {}): Hypothesis =>
  ({
    id: 'hyp-1',
    statement: 'Test',
    status: 'Open',
    sourceType: 'Other',
    entityRefs: [],
    relatedArtefacts: [],
    qualityAttributes: [],
    uncertainty: 'High',
    impact: 'Medium',
    technicalPlannings: [
      {
        id: 'tp-aaaabbbb-cccc-dddd',
        actionType: 'Spike',
        entityRef: 'comp:default/svc',
        description: 'desc',
        expectedOutcome: 'outcome',
        documentations: [],
        targetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Hypothesis;

const createMockEvents = (): HypothesisEvent[] => [
  {
    id: 'evt-1',
    hypothesisId: 'hyp-1',
    eventType: 'CREATE',
    changes: { uncertainty: 'High', impact: 'Medium' },
    timestamp: new Date('2026-01-01'),
  } as HypothesisEvent,
  {
    id: 'evt-2',
    hypothesisId: 'hyp-1',
    eventType: 'TECHNICAL_PLANNING_CREATE',
    technicalPlanningId: 'tp-aaaabbbb-cccc-dddd',
    changes: { uncertainty: 'Very High', technicalPlanningId: 'tp-aaaabbbb-cccc-dddd' },
    timestamp: new Date('2026-02-01'),
  } as HypothesisEvent,
  {
    id: 'evt-3',
    hypothesisId: 'hyp-1',
    eventType: 'TECHNICAL_PLANNING_UPDATE',
    technicalPlanningId: 'tp-aaaabbbb-cccc-dddd',
    changes: { impact: 'High', technicalPlanningId: 'tp-aaaabbbb-cccc-dddd' },
    timestamp: new Date('2026-03-01'),
  } as HypothesisEvent,
];

describe('EvolutionChart', () => {
  it('renders "No events found" when events array is empty', () => {
    const hypothesis = createMockHypothesis();
    renderWithTheme(<EvolutionChart hypothesis={hypothesis} events={[]} />);

    expect(screen.getByText('No events found to show the evolution')).toBeInTheDocument();
  });

  it('renders chart with legend when events exist', () => {
    const hypothesis = createMockHypothesis();
    const events = createMockEvents();
    renderWithTheme(<EvolutionChart hypothesis={hypothesis} events={events} />);

    expect(screen.getByText('Evolution of Uncertainty and Impact')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText('Manual / Creation')).toBeInTheDocument();
    expect(screen.getByText('Technical Planning')).toBeInTheDocument();
  });

  it('prepareChartData carries forward uncertainty when only impact changes', () => {
    const hypothesis = createMockHypothesis();
    const events: HypothesisEvent[] = [
      {
        id: 'evt-1',
        hypothesisId: 'hyp-1',
        eventType: 'CREATE',
        changes: { uncertainty: 'High', impact: 'Medium' },
        timestamp: new Date('2026-01-01'),
      } as HypothesisEvent,
      {
        id: 'evt-2',
        hypothesisId: 'hyp-1',
        eventType: 'UPDATE',
        changes: { impact: 'High' },
        timestamp: new Date('2026-02-01'),
      } as HypothesisEvent,
    ];
    renderWithTheme(<EvolutionChart hypothesis={hypothesis} events={events} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText(/Evolution of Uncertainty and Impact/)).toBeInTheDocument();
  });

  it('prepareChartData carries forward impact when only uncertainty changes', () => {
    const hypothesis = createMockHypothesis();
    const events: HypothesisEvent[] = [
      {
        id: 'evt-1',
        hypothesisId: 'hyp-1',
        eventType: 'CREATE',
        changes: { uncertainty: 'High', impact: 'Medium' },
        timestamp: new Date('2026-01-01'),
      } as HypothesisEvent,
      {
        id: 'evt-2',
        hypothesisId: 'hyp-1',
        eventType: 'TECHNICAL_PLANNING_CREATE',
        technicalPlanningId: 'tp-aaaabbbb-cccc-dddd',
        changes: { uncertainty: 'Very High', technicalPlanningId: 'tp-aaaabbbb-cccc-dddd' },
        timestamp: new Date('2026-02-01'),
      } as HypothesisEvent,
    ];
    renderWithTheme(<EvolutionChart hypothesis={hypothesis} events={events} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText(/Evolution of Uncertainty and Impact/)).toBeInTheDocument();
  });

  it('renders dot shape legend for Manual/Creation and Technical Planning', () => {
    const hypothesis = createMockHypothesis();
    const events = createMockEvents();
    renderWithTheme(<EvolutionChart hypothesis={hypothesis} events={events} />);

    expect(screen.getByText('Manual / Creation')).toBeInTheDocument();
    expect(screen.getByText('Technical Planning')).toBeInTheDocument();
    const circles = document.querySelectorAll('svg circle');
    const rects = document.querySelectorAll('svg rect');
    expect(circles.length).toBeGreaterThan(0);
    expect(rects.length).toBeGreaterThan(0);
  });
});
