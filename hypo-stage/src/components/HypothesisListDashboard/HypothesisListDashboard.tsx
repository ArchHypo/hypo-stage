import { default as React } from 'react';
import { Box, Typography } from '@material-ui/core';
import PriorityHigh from '@material-ui/icons/PriorityHigh';
import { Progress } from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef, GetHypothesesStatsOptions } from '../../api/HypoStageApi';
import {
  useStyles as useSharedStyles,
  getStatusClass,
  getUncertaintyClass,
  getImpactClass,
} from '../../hooks/useStyles';
import { useStyles } from './HypothesisListDashboard.styles';

const LIKERT_ORDER = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export interface HypothesisListDashboardProps {
  /** When set, stats are scoped to this component (e.g. from catalog entity tab). */
  entityRef?: string | null;
  /** When set (and not entity-scoped), stats are filtered by team. */
  selectedTeam?: string | null;
  /** When set (and not entity-scoped), stats are filtered by component. */
  selectedComponentRef?: string | null;
  /** Refresh when this changes (e.g. after list refresh). */
  refreshKey?: number;
  /** Time window in days for main total (default 90); recent count is always last 30 days. */
  sinceDays?: number;
}

export function HypothesisListDashboard({
  entityRef,
  selectedTeam,
  selectedComponentRef,
  refreshKey = 0,
  sinceDays = 90,
}: HypothesisListDashboardProps) {
  const hypoStageApi = useApi(HypoStageApiRef);
  const sharedClasses = useSharedStyles();
  const classes = useStyles();

  const options: GetHypothesesStatsOptions = {
    ...(entityRef && { entityRef }),
    ...(!entityRef && selectedTeam !== undefined && selectedTeam !== null && { team: selectedTeam }),
    ...(!entityRef &&
      selectedComponentRef !== undefined &&
      selectedComponentRef !== null && { entityRef: selectedComponentRef }),
    sinceDays,
  };

  const { value: stats, loading, error } = useAsync(
    () => hypoStageApi.getHypothesesStats(options),
    [refreshKey, entityRef, selectedTeam, selectedComponentRef, sinceDays],
  );

  if (loading) {
    return (
      <Box className={classes.root}>
        <Progress />
      </Box>
    );
  }

  if (error || !stats) {
    return null;
  }

  const validatedCount = stats.byStatus?.Validated ?? 0;
  const openCount = stats.byStatus?.Open ?? 0;

  return (
    <Box className={classes.root}>
      {/* Overview */}
      <Box className={classes.section}>
        <Typography className={classes.sectionTitle}>Overview</Typography>
        <Box className={classes.overviewGrid}>
          <StatCard label="Total" value={stats.total} />
          <StatusStatCard
            label="Validated"
            value={validatedCount}
            statusClass={getStatusClass('Validated', sharedClasses)}
          />
          <StatusStatCard
            label="Open"
            value={openCount}
            statusClass={getStatusClass('Open', sharedClasses)}
          />
          <StatCard label="Created (30d)" value={stats.inLast30Days} />
        </Box>
      </Box>

      {/* ArchHypo: where to focus — high-visibility to draw developer attention */}
      <Box className={classes.focusSection}>
        <Box className={classes.focusSectionTitleWrap}>
          <PriorityHigh className={classes.focusSectionIcon} />
          <Typography component="h3" className={classes.focusSectionTitle}>
            Where to focus
          </Typography>
        </Box>
        <Box className={classes.insightsGrid}>
          <InsightCard
            value={stats.needAttention ?? 0}
            label="Need attention"
            subtext="High uncertainty & impact — consider technical plans to reduce uncertainty or impact."
            variant="warning"
          />
          <InsightCard
            value={stats.canPostpone ?? 0}
            label="Can postpone"
            subtext="Low impact — safe to delay architectural decisions."
            variant="success"
          />
        </Box>
      </Box>

      {/* Uncertainty & impact — two clearly distinct panels */}
      <Box className={classes.section}>
        <Typography className={classes.sectionTitle}>Uncertainty & impact</Typography>
        <Box className={classes.distributionRow}>
          <MetricPanel
            title="Uncertainty"
            subtitle="How far the team is from proving the hypothesis"
            levels={stats.byUncertainty ?? {}}
            getChipClass={level => getUncertaintyClass(level, sharedClasses)}
            panelClass={classes.metricPanelUncertainty}
          />
          <MetricPanel
            title="Impact"
            subtitle="Consequences if the hypothesis is wrong"
            levels={stats.byImpact ?? {}}
            getChipClass={level => getImpactClass(level, sharedClasses)}
            panelClass={classes.metricPanelImpact}
          />
        </Box>
      </Box>
    </Box>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const classes = useStyles();
  return (
    <Box className={classes.statCard}>
      <Typography className={classes.statLabel}>{label}</Typography>
      <Typography className={classes.statValue}>{value}</Typography>
    </Box>
  );
}

function StatusStatCard({
  label,
  value,
  statusClass,
}: {
  label: string;
  value: number;
  statusClass: string;
}) {
  const classes = useStyles();
  return (
    <Box className={classes.statCard}>
      <Typography className={classes.statLabel}>{label}</Typography>
      <Typography className={classes.statValue}>{value}</Typography>
      <Box className={classes.statChipWrap}>
        <span className={`${classes.statChip} ${statusClass}`}>{label}</span>
      </Box>
    </Box>
  );
}

function InsightCard({
  value,
  label,
  subtext,
  variant,
}: {
  value: number;
  label: string;
  subtext: string;
  variant: 'warning' | 'success';
}) {
  const classes = useStyles();
  return (
    <Box
      className={`${classes.insightCard} ${
        variant === 'warning' ? classes.insightCardWarning : classes.insightCardSuccess
      }`}
    >
      <Typography className={classes.statLabel}>{label}</Typography>
      <Typography className={classes.statValue}>{value}</Typography>
      <Typography className={classes.insightSubtext}>{subtext}</Typography>
    </Box>
  );
}

function MetricPanel({
  title,
  subtitle,
  levels,
  getChipClass,
  panelClass,
}: {
  title: string;
  subtitle: string;
  levels: Record<string, number>;
  getChipClass: (level: string) => string;
  panelClass: string;
}) {
  const classes = useStyles();
  const items = LIKERT_ORDER.filter(level => (levels[level] ?? 0) > 0).map(level => ({
    level,
    count: levels[level] ?? 0,
    chipClass: getChipClass(level),
  }));

  return (
    <Box className={`${classes.metricPanel} ${panelClass}`}>
      <Typography className={classes.metricPanelTitle}>{title}</Typography>
      <Typography component="p" className={classes.insightSubtext} style={{ marginTop: 0, marginBottom: 8 }}>
        {subtitle}
      </Typography>
      {items.length === 0 ? (
        <Typography className={classes.metricPanelEmpty}>No hypotheses in this view</Typography>
      ) : (
        <Box component="ul" className={classes.metricPanelList}>
          {items.map(({ level, count, chipClass }) => (
            <Box key={level} component="li" className={classes.metricPanelItem}>
              <span className={`${classes.statChip} ${chipClass} ${classes.metricPanelItemChip}`}>
                {level}
              </span>
              <Typography className={classes.statValue} style={{ fontSize: '0.875rem' }}>
                {count}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
