import { makeStyles } from '@material-ui/core/styles';

export const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(3),
    width: '100%',
    maxWidth: '100%',
  },
  section: {
    marginBottom: theme.spacing(2.5),
    width: '100%',
    '&:last-of-type': {
      marginBottom: 0,
    },
  },
  /** "Where to focus" — high-visibility section (red tone with transparency) */
  focusSection: {
    marginBottom: theme.spacing(3),
    width: '100%',
    padding: theme.spacing(2),
    borderRadius: 12,
    boxSizing: 'border-box',
    background:
      theme.palette.type === 'dark'
        ? 'rgba(180, 60, 60, 0.18)'
        : 'rgba(200, 70, 70, 0.12)',
    border: `2px solid ${theme.palette.type === 'dark' ? 'rgba(220, 80, 80, 0.5)' : 'rgba(180, 60, 60, 0.4)'}`,
    boxShadow: `0 4px 12px ${theme.palette.type === 'dark' ? 'rgba(180,60,60,0.15)' : 'rgba(180,60,60,0.1)'}`,
  },
  focusSectionTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  focusSectionIcon: {
    color: theme.palette.error?.main ?? '#c62828',
    fontSize: 28,
  },
  focusSectionTitle: {
    fontSize: '1rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: theme.palette.error?.dark ?? '#b71c1c',
    margin: 0,
  },
  sectionTitle: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: theme.spacing(1.5),
    width: '100%',
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [theme.breakpoints.down('xs')]: {
      gridTemplateColumns: '1fr',
    },
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(1.5),
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  statCard: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  statChipWrap: {
    marginTop: theme.spacing(0.5),
    flexShrink: 0,
  },
  insightCard: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderLeftWidth: 4,
    minWidth: 0,
  },
  /** Bold, tag-like cards for "Where to focus" — match Focus tags in list */
  insightCardWarning: {
    borderLeftWidth: 6,
    borderLeftColor: theme.palette.warning?.main ?? '#ed6c02',
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(237, 108, 2, 0.12)'
      : 'rgba(237, 108, 2, 0.08)',
    borderColor: theme.palette.warning?.main ?? '#ed6c02',
    borderWidth: 1,
    boxShadow: `0 2px 8px ${theme.palette.type === 'dark' ? 'rgba(237,108,2,0.2)' : 'rgba(237,108,2,0.15)'}`,
    '& $statLabel': {
      color: theme.palette.warning?.dark ?? '#c43e00',
      fontWeight: 700,
    },
    '& $statValue': {
      color: theme.palette.warning?.dark ?? '#c43e00',
      fontSize: '1.5rem',
    },
  },
  insightCardSuccess: {
    borderLeftWidth: 6,
    borderLeftColor: theme.palette.success?.main ?? '#2e7d32',
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(46, 125, 50, 0.12)'
      : 'rgba(46, 125, 50, 0.08)',
    borderColor: theme.palette.success?.main ?? '#2e7d32',
    borderWidth: 1,
    boxShadow: `0 2px 8px ${theme.palette.type === 'dark' ? 'rgba(46,125,50,0.2)' : 'rgba(46,125,50,0.15)'}`,
    '& $statLabel': {
      color: theme.palette.success?.dark ?? '#1b5e20',
      fontWeight: 700,
    },
    '& $statValue': {
      color: theme.palette.success?.dark ?? '#1b5e20',
      fontSize: '1.5rem',
    },
  },
  statLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(0.5),
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  insightSubtext: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    lineHeight: 1.3,
  },
  statChip: {
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  distributionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(2),
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
      gap: theme.spacing(1.5),
    },
  },
  metricPanel: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderLeftWidth: 4,
    minWidth: 0,
  },
  metricPanelUncertainty: {
    borderLeftColor: theme.palette.info?.main ?? '#0288d1',
  },
  metricPanelImpact: {
    borderLeftColor: theme.palette.warning?.main ?? '#ed6c02',
  },
  metricPanelTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(1),
  },
  metricPanelList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  metricPanelItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(0.5, 0),
    fontSize: '0.875rem',
    '&:not(:last-child)': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },
  metricPanelItemChip: {
    marginRight: theme.spacing(1),
    flexShrink: 0,
  },
  metricPanelEmpty: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
}));
