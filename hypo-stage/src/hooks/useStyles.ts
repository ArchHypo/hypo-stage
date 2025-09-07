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
      padding: '32px',
      color: 'white',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    cardContainer: {
      marginBottom: '16px',
    },
    paperContainer: {
      padding: '16px',
      marginTop: '16px',
    },
    sectionContainer: {
      width: '100%',
    },

    // Typography Styles
    formTitle: {
      fontSize: '28px',
      fontWeight: 700,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    formSubtitle: {
      fontSize: '16px',
      opacity: 0.9,
      marginBottom: '32px',
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
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: '16px',
      fontWeight: 600,
    },
    helperText: {
      fontSize: '14px',
      opacity: 0.8,
      marginBottom: '16px',
      lineHeight: 1.5,
    },
    secondaryText: {
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: '8px',
    },
    linkText: {
      color: '#007bff',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '14px',
    },

    // Form & Input Styles
    inputField: {
      '& .MuiOutlinedInput-root': {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 1)',
        },
        '&.Mui-focused': {
          backgroundColor: 'rgba(255, 255, 255, 1)',
        },
      },
      '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: 600,
      },
      '& .MuiInputLabel-root.Mui-focused': {
        color: 'rgba(255, 255, 255, 1)',
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
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '20px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
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
      opacity: 0.8,
      marginBottom: '16px',
      lineHeight: 1.5,
    },
    starContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px',
    },
    starButton: {
      color: 'rgba(255, 255, 255, 0.7)',
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
      color: 'rgba(255, 255, 255, 0.3)',
    },
    ratingLabel: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'rgba(255, 255, 255, 0.9)',
      marginLeft: '12px',
    },

    // Chip & Badge Styles
    chip: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      fontWeight: 600,
      margin: '4px',
    },
    statusChip: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
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

    // Spacing & Layout Utilities
    marginTop: {
      marginTop: '16px',
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
      marginRight: '16px',
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

    // Chart Container
    chartContainer: {
      height: '400px',
      marginTop: '16px',
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
