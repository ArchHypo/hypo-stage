import { default as React, useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@material-ui/core';
import Assessment from '@material-ui/icons/Assessment';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { HypothesisEvent, Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { getRatingNumber, getValueLabel } from '../../../utils/formatters';
import { useStyles } from '../../../hooks/useStyles';

interface ChartDataPoint {
  timestamp: string;
  displayLabel: string;
  uncertainty: number | undefined;
  impact: number | undefined;
  technicalPlanningId?: string | null;
  eventType?: string;
}

interface EvolutionChartProps {
  hypothesis: Hypothesis;
  events: HypothesisEvent[];
  className?: string;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload, stroke } = props;
  if (cx === null || cx === undefined || cy === null || cy === undefined || (payload.uncertainty === null || payload.uncertainty === undefined) && (payload.impact === null || payload.impact === undefined)) return null;

  const isTechPlanEvent =
    payload.eventType === 'TECHNICAL_PLANNING_CREATE' ||
    payload.eventType === 'TECHNICAL_PLANNING_UPDATE';

  if (isTechPlanEvent) {
    const size = 5;
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        fill={stroke}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={stroke}
      stroke={stroke}
      strokeWidth={2}
    />
  );
};

const CustomTooltipContent = ({ active, payload, hypothesis }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload as ChartDataPoint;
  const isTechPlanningEvent =
    dataPoint.eventType === 'TECHNICAL_PLANNING_CREATE' ||
    dataPoint.eventType === 'TECHNICAL_PLANNING_UPDATE';

  let headerLabel = dataPoint.displayLabel;
  let sourceLabel = 'Manual change';
  if (dataPoint.eventType === 'CREATE') {
    headerLabel = 'Hypothesis creation';
    sourceLabel = dataPoint.displayLabel;
  } else if (isTechPlanningEvent) {
    const actionWord = dataPoint.eventType === 'TECHNICAL_PLANNING_CREATE' ? 'Created' : 'Updated';
    if (dataPoint.technicalPlanningId && hypothesis?.technicalPlannings) {
      const plannings = hypothesis.technicalPlannings;
      const planIndex = plannings.findIndex(
        (tp: any) => tp.id === dataPoint.technicalPlanningId,
      );
      const techPlan = planIndex >= 0 ? plannings[planIndex] : null;
      if (techPlan) {
        headerLabel = `Technical Planning #${planIndex + 1}`;
        sourceLabel = dataPoint.technicalPlanningId.substring(0, 8);
      } else {
        headerLabel = `Technical Planning ${actionWord}`;
        sourceLabel = dataPoint.technicalPlanningId.substring(0, 8);
      }
    } else {
      headerLabel = `Technical Planning ${actionWord}`;
      sourceLabel = dataPoint.technicalPlanningId
        ? dataPoint.technicalPlanningId.substring(0, 8)
        : dataPoint.displayLabel;
    }
  }

  return (
    <Box
      style={{
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '8px 12px',
        color: '#333',
      }}
    >
      <Typography variant="caption" style={{ fontWeight: 600, color: '#333', display: 'block' }}>
        {headerLabel}
      </Typography>
      <Typography variant="caption" style={{ color: '#666', display: 'block' }}>
        {sourceLabel}
      </Typography>
      {payload.map((entry: any, index: number) => (
        entry.value !== null && entry.value !== undefined && (
          <Typography
            key={index}
            variant="caption"
            display="block"
            style={{ color: entry.color }}
          >
            {entry.name === 'uncertainty' ? 'Uncertainty' : 'Impact'}: {getValueLabel(entry.value)}
          </Typography>
        )
      ))}
    </Box>
  );
};

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  hypothesis,
  events,
  className
}) => {
  const classes = useStyles();
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!hypothesis || events.length === 0) return [];

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const dates = sortedEvents.map(e =>
      new Date(e.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    );
    const hasDuplicateDates = new Set(dates).size < dates.length;

    const points: ChartDataPoint[] = [];
    let lastUncertainty: number | undefined;
    let lastImpact: number | undefined;

    sortedEvents.forEach(event => {
      const changes = event.changes as Record<string, any>;
      if (changes.uncertainty) {
        lastUncertainty = getRatingNumber(changes.uncertainty);
      }
      if (changes.impact) {
        lastImpact = getRatingNumber(changes.impact);
      }
      const date = new Date(event.timestamp);
      const dateLabel = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const timeLabel = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      points.push({
        timestamp: `${dateLabel} ${timeLabel}`,
        displayLabel: hasDuplicateDates ? `${dateLabel} ${timeLabel}` : dateLabel,
        uncertainty: lastUncertainty,
        impact: lastImpact,
        technicalPlanningId: event.technicalPlanningId ?? changes.technicalPlanningId ?? null,
        eventType: event.eventType,
      });
    });

    return points;
  }, [hypothesis, events]);

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
          <>
            <Box display="flex" alignItems="center" style={{ gap: 16, marginBottom: 8 }}>
              <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="#666" /></svg>
                <Typography variant="caption" color="textSecondary">Manual / Creation</Typography>
              </Box>
              <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                <svg width="12" height="12"><rect x="1" y="1" width="10" height="10" fill="#666" /></svg>
                <Typography variant="caption" color="textSecondary">Technical Planning</Typography>
              </Box>
            </Box>
            <div className={classes.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayLabel"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={getValueLabel}
                  />
                  <Tooltip content={<CustomTooltipContent hypothesis={hypothesis} />} />
                  <Legend
                    formatter={(value) => value === 'uncertainty' ? 'Uncertainty' : 'Impact'}
                  />
                  <Line
                    type="monotone"
                    dataKey="uncertainty"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="impact"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No events found to show the evolution
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
