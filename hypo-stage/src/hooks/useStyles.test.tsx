import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@material-ui/core/styles';
import { createTheme } from '@material-ui/core/styles';
import {
  useStyles,
  getStatusClass,
  getUncertaintyClass,
  getImpactClass,
} from './useStyles';

const theme = createTheme();

function TestComponent() {
  const classes = useStyles();
  return (
    <div data-testid="styled-root">
      <div data-classes={Object.keys(classes).join(',')} />
    </div>
  );
}

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('useStyles', () => {
  it('should return styles object with responsive layout classes', () => {
    const { getByTestId } = renderWithTheme(<TestComponent />);
    const classesEl = getByTestId('styled-root').querySelector('[data-classes]');
    const classKeys = classesEl?.getAttribute('data-classes')?.split(',') ?? [];

    expect(classKeys).toContain('tableWrapper');
    expect(classKeys).toContain('actionBar');
    expect(classKeys).toContain('filterBar');
    expect(classKeys).toContain('technicalPlanningHeader');
  });

  it('should return form and container classes', () => {
    const { getByTestId } = renderWithTheme(<TestComponent />);
    const classesEl = getByTestId('styled-root').querySelector('[data-classes]');
    const classKeys = classesEl?.getAttribute('data-classes')?.split(',') ?? [];

    expect(classKeys).toContain('formContainer');
    expect(classKeys).toContain('paperContainer');
    expect(classKeys).toContain('statusChip');
  });

  it('should return utility functions getStatusClass, getUncertaintyClass, getImpactClass', () => {
    const mockClasses = {
      statusOpen: 'status-open',
      uncertaintyMedium: 'uncertainty-medium',
      impactHigh: 'impact-high',
    };

    expect(getStatusClass('Open', mockClasses)).toBe('status-open');
    expect(getUncertaintyClass('Medium', mockClasses)).toBe('uncertainty-medium');
    expect(getImpactClass('High', mockClasses)).toBe('impact-high');
  });
});
