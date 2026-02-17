import { default as React } from 'react';
import { Card, CardContent, Typography } from '@material-ui/core';
import Assessment from '@material-ui/icons/Assessment';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { HypothesisEvent } from '@internal/plugin-hypo-stage-backend';
import { getRatingNumber, getValueLabel } from '../../../utils/formatters';
import { useStyles } from '../../../hooks/useStyles';

interface EvolutionChartProps {
  hypothesis: any; // Hypothesis type
  events: HypothesisEvent[];
  className?: string;
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  hypothesis,
  events,
  className
}) => {
  const classes = useStyles();
  const prepareChartData = () => {
    if (!hypothesis || events.length === 0) return [];

    const chartData: {
      timestamp: string;
      uncertainty: number | undefined;
      impact: number | undefined;
    }[] = [];

    // Add values from events
    events.forEach(event => {
      const hasUncertainty = event.changes.uncertainty;
      const hasImpact = event.changes.impact;
      chartData.push({
        timestamp: new Date(event.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        uncertainty: hasUncertainty ? getRatingNumber(event.changes.uncertainty) : undefined,
        impact: hasImpact ? getRatingNumber(event.changes.impact) : undefined,
      });
    });

    return chartData;
  };

  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h5" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Assessment />
          Evolution of Uncertainty and Impact
        </Typography>

        {events.length > 0 ? (
          <div className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={getValueLabel}
                />
                <Legend
                  formatter={(value) => value === 'uncertainty' ? 'Uncertainty' : 'Impact'}
                />
                <Line
                  type="monotone"
                  dataKey="uncertainty"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="impact"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No events found to show the evolution
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
