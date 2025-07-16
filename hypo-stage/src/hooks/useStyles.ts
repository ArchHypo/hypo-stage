import {
  makeStyles,
  createStyles,
} from '@material-ui/core';

export const useStyles = makeStyles(() =>
  createStyles({
    formContainer: {
      // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '32px',
      color: 'white',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
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
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginTop: '20px',
    },
    fullWidth: {
      gridColumn: '1 / -1',
    },
    chip: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      color: 'white',
      fontWeight: 600,
      margin: '4px',
    },
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
  })
);
