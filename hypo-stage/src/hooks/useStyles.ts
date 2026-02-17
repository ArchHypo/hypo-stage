import {
  makeStyles,
  createStyles,
  Theme,
} from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    // Layout & Container Styles
    formContainer: {
      borderRadius: '16px',
      padding: theme.spacing(3),
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.background.paper,
      marginBottom: theme.spacing(3),
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
        : '0 8px 32px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
      },
      [theme.breakpoints.down('xs')]: {
        padding: theme.spacing(1.5),
      },
    },
    cardContainer: {
      marginBottom: theme.spacing(2),
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
    },
    paperContainer: {
      padding: theme.spacing(2),
      marginTop: theme.spacing(2),
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.5),
        marginTop: theme.spacing(1.5),
      },
      [theme.breakpoints.down('xs')]: {
        padding: theme.spacing(1),
        marginTop: theme.spacing(1),
      },
    },
    sectionContainer: {
      width: '100%',
    },

    // Typography Styles
    formTitle: {
      fontSize: '1.75rem',
      fontWeight: 700,
      marginBottom: theme.spacing(1),
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.5),
      flexWrap: 'wrap',
      wordBreak: 'break-word',
      [theme.breakpoints.down('sm')]: {
        fontSize: '1.35rem',
      },
      [theme.breakpoints.down('xs')]: {
        fontSize: '1.2rem',
      },
    },
    formSubtitle: {
      fontSize: '1rem',
      opacity: 0.9,
      marginBottom: theme.spacing(3),
      wordBreak: 'break-word',
      [theme.breakpoints.down('sm')]: {
        fontSize: '0.9rem',
        marginBottom: theme.spacing(2),
      },
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: 600,
      marginBottom: '16px',
    },
    subtitle: {
      color: theme.palette.text.secondary,
      marginBottom: '16px',
      fontWeight: 600,
    },
    helperText: {
      fontSize: '14px',
      color: theme.palette.text.secondary,
      marginBottom: '16px',
      lineHeight: 1.5,
    },
    secondaryText: {
      fontSize: '14px',
      color: theme.palette.text.secondary,
      marginTop: '8px',
    },
    linkText: {
      color: '#007bff',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '14px',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
    },

    // Form & Input Styles
    inputField: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: theme.palette.background.default,
        borderRadius: '12px',
        '&:hover': {
          backgroundColor: theme.palette.background.default,
        },
        '&.Mui-focused': {
          backgroundColor: theme.palette.background.default,
        },
      },
      '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
        fontWeight: 600,
      },
      '& .MuiInputLabel-root.Mui-focused': {
        color: theme.palette.primary.main,
      },
    },
    inputFieldWithMargin: {
      marginBottom: '16px',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '20px',
      marginTop: '20px',
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },

    // Button Styles
    submitButton: {
      background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
      borderRadius: '12px',
      padding: '12px 32px',
      fontSize: '16px',
      fontWeight: 600,
      textTransform: 'none',
      boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
      },
      '&:disabled': {
        background: 'rgba(255, 255, 255, 0.2)',
        color: 'rgba(255, 255, 255, 0.5)',
        boxShadow: 'none',
        transform: 'none',
      },
    },
    secondaryButton: {
      marginRight: '16px',
    },
    iconButton: {
      margin: '8px',
    },
    smallChip: {
      margin: '2px',
    },

    // Rating & Star Styles
    ratingSection: {
      backgroundColor: theme.palette.type === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '20px',
      backdropFilter: 'blur(10px)',
      border: theme.palette.type === 'dark'
        ? '1px solid rgba(255, 255, 255, 0.2)'
        : '1px solid rgba(0, 0, 0, 0.1)',
    },
    ratingTitle: {
      fontSize: '18px',
      fontWeight: 600,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    ratingDescription: {
      fontSize: '14px',
      color: theme.palette.text.secondary,
      marginBottom: '16px',
      lineHeight: 1.5,
    },
    starContainer: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
    },
    starButton: {
      color: theme.palette.text.secondary,
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'scale(1.1)',
        color: '#ffd700',
      },
    },
    starActive: {
      color: '#ffd700 !important',
      filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))',
    },
    starInactive: {
      color: theme.palette.text.disabled,
    },
    ratingLabel: {
      fontSize: '14px',
      fontWeight: 600,
      color: theme.palette.text.primary,
      marginLeft: '12px',
    },

    // Chip & Badge Styles
    chip: {
      backgroundColor: theme.palette.type === 'dark'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'rgba(0, 0, 0, 0.1)',
      color: theme.palette.text.primary,
      fontWeight: 600,
      margin: '4px',
    },
    statusChip: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      [theme.breakpoints.down('xs')]: {
        fontSize: '11px',
        padding: '2px 6px',
      },
    },

    // Status Colors (consolidated from statusStyles.ts)
    statusOpen: {
      backgroundColor: '#cce5ff',
      color: '#004085',
    },
    statusInReview: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    statusValidated: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    statusDiscarded: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    statusTriggerFired: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
    },
    statusOther: {
      backgroundColor: '#e2e3e5',
      color: '#383d41',
    },
    statusInProgress: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    statusPlanning: {
      backgroundColor: '#cce5ff',
      color: '#004085',
    },
    statusTesting: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    statusCompleted: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
    },
    statusResearch: {
      backgroundColor: '#e2e3e5',
      color: '#383d41',
    },

    // Uncertainty Colors
    uncertaintyVeryHigh: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    uncertaintyHigh: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    uncertaintyMedium: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    uncertaintyLow: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    uncertaintyVeryLow: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },

    // Impact Colors
    impactVeryHigh: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      fontWeight: 'bold',
    },
    impactHigh: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      fontWeight: 'bold',
    },
    impactMedium: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    impactLow: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    impactVeryLow: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },

    // Focus tags (ArchHypo: need attention / can postpone)
    focusChipNeedAttention: {
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      display: 'inline-block',
      flexShrink: 0,
      backgroundColor: theme.palette.warning?.main ?? '#ed6c02',
      color: theme.palette.warning?.contrastText ?? '#fff',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      [theme.breakpoints.down('xs')]: {
        padding: '2px 6px',
        fontSize: 10,
      },
    },
    focusChipCanPostpone: {
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      display: 'inline-block',
      flexShrink: 0,
      backgroundColor: theme.palette.success?.main ?? '#2e7d32',
      color: theme.palette.success?.contrastText ?? '#fff',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      [theme.breakpoints.down('xs')]: {
        padding: '2px 6px',
        fontSize: 10,
      },
    },

    // Validation & Error Styles
    validationMessage: {
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    validationError: {
      color: '#ff6b6b',
    },
    validationSuccess: {
      color: '#51cf66',
    },

    // Table responsive wrapper (horizontal scroll on small screens)
    tableWrapper: {
      width: '100%',
      maxWidth: '100%',
      overflowX: 'auto',
      overflowY: 'visible',
      marginBottom: theme.spacing(2),
      WebkitOverflowScrolling: 'touch',
    },

    // Action bar responsive (buttons wrap on small screens)
    actionBar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(2),
      '& > *': {
        flexShrink: 0,
      },
    },

    // Filter bar responsive
    filterBar: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing(2),
      marginBottom: theme.spacing(2),
      '& > *': {
        minWidth: 0,
        flex: '1 1 auto',
        [theme.breakpoints.up('sm')]: {
          flex: '0 1 auto',
        },
      },
    },

    // Spacing & Layout Utilities
    marginTop: {
      marginTop: theme.spacing(2),
    },
    marginTopLarge: {
      marginTop: '24px',
    },
    marginBottom: {
      marginBottom: '16px',
    },
    marginBottomLarge: {
      marginBottom: '24px',
    },
    marginRight: {
      marginRight: theme.spacing(2),
    },
    marginLeft: {
      marginLeft: '8px',
    },

    // Divider Styles
    divider: {
      margin: '24px 0',
    },

    // List Styles
    denseList: {
      marginTop: '16px',
    },
    denseListBottom: {
      marginBottom: '16px',
    },

    // Flex Layouts
    flexWrap: {
      display: 'flex',
      flexWrap: 'wrap',
    },
    flexBetween: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    technicalPlanningHeader: {
      flexWrap: 'wrap',
      gap: theme.spacing(2),
      [theme.breakpoints.down('xs')]: {
        flexDirection: 'column',
        alignItems: 'stretch',
      },
    },

    // Chart Container
    chartContainer: {
      height: 400,
      minHeight: 280,
      marginTop: theme.spacing(2),
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      [theme.breakpoints.down('sm')]: {
        height: 320,
        minHeight: 240,
      },
      [theme.breakpoints.down('xs')]: {
        height: 280,
        minHeight: 200,
      },
    },

    // Loading States
    loadingText: {
      marginLeft: '8px',
    },
  })
);

// Utility functions for status class mapping
export const getStatusClass = (status: string, classes: any): string => {
  switch (status) {
    case 'Open':
      return classes.statusOpen;
    case 'In Review':
      return classes.statusInReview;
    case 'Validated':
      return classes.statusValidated;
    case 'Discarded':
      return classes.statusDiscarded;
    case 'Trigger-Fired':
      return classes.statusTriggerFired;
    case 'Other':
      return classes.statusOther;
    case 'In Progress':
      return classes.statusInProgress;
    case 'Planning':
      return classes.statusPlanning;
    case 'Testing':
      return classes.statusTesting;
    case 'Completed':
      return classes.statusCompleted;
    case 'Research':
      return classes.statusResearch;
    default:
      return classes.statusOpen;
  }
};

export const getUncertaintyClass = (uncertainty: string, classes: any): string => {
  switch (uncertainty) {
    case 'Very High':
      return classes.uncertaintyVeryHigh;
    case 'High':
      return classes.uncertaintyHigh;
    case 'Medium':
      return classes.uncertaintyMedium;
    case 'Low':
      return classes.uncertaintyLow;
    case 'Very Low':
      return classes.uncertaintyVeryLow;
    default:
      return classes.uncertaintyMedium;
  }
};

export const getImpactClass = (impact: string, classes: any): string => {
  switch (impact) {
    case 'Very High':
      return classes.impactVeryHigh;
    case 'High':
      return classes.impactHigh;
    case 'Medium':
      return classes.impactMedium;
    case 'Low':
      return classes.impactLow;
    case 'Very Low':
      return classes.impactVeryLow;
    default:
      return classes.impactMedium;
  }
};
