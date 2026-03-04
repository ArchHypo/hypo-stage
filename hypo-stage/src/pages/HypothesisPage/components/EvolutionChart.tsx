import { default as React } from 'react';
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

  const isLinkedToTechPlan = !!payload.technicalPlanningId;

  if (isLinkedToTechPlan) {
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
  const isLinkedToTechPlan = !!dataPoint.technicalPlanningId;

  let sourceLabel = 'Manual change';
  let planningIdLabel: string | null = null;
  if (dataPoint.eventType === 'CREATE') {
    sourceLabel = 'Hypothesis creation';
  } else if (isLinkedToTechPlan && hypothesis?.technicalPlannings) {
    const techPlan = hypothesis.technicalPlannings.find(
      (tp: any) => tp.id === dataPoint.technicalPlanningId,
    );
    sourceLabel = techPlan
      ? `Technical Planning: ${techPlan.actionType}`
      : 'Technical Planning (deleted)';
    if (dataPoint.technicalPlanningId) {
      planningIdLabel = dataPoint.technicalPlanningId.substring(0, 8);
    }
  }

  return (
    <Box
      style={{
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '8px 12px',
      }}
    >
      <Typography variant="caption" style={{ fontWeight: 600 }}>
        {dataPoint.timestamp}
      </Typography>
      <Typography variant="caption" display="block" color="textSecondary">
        {sourceLabel}
      </Typography>
      {planningIdLabel && (
        <Typography
          variant="caption"
          display="block"
          style={{ fontFamily: 'monospace', color: '#555' }}
        >
          ID: {planningIdLabel}
        </Typography>
      )}
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
  const prepareChartData = (): ChartDataPoint[] => {
    if (!hypothesis || events.length === 0) return [];

    const chartData: ChartDataPoint[] = [];

    events.forEach(event => {
      const changes = event.changes as Record<string, any>;
      const hasUncertainty = changes.uncertainty;
      const hasImpact = changes.impact;
      chartData.push({
        timestamp: new Date(event.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        uncertainty: hasUncertainty ? getRatingNumber(changes.uncertainty) : undefined,
        impact: hasImpact ? getRatingNumber(changes.impact) : undefined,
        technicalPlanningId: event.technicalPlanningId ?? null,
        eventType: event.eventType,
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
