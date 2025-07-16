import {
  Typography,
  TextField,
  Box,
  Button,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  IconButton
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Star from '@material-ui/icons/Star';
import Add from '@material-ui/icons/Add';
import TrendingUp from '@material-ui/icons/TrendingUp';
import Help from '@material-ui/icons/Help';
import { useState } from 'react';
import { useStyles } from '../hooks/useStyles';

// Enhanced Star Rating Component
const StarRating = ({
  rating,
  onRatingChange,
  label,
  description
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
  description: string;
}) => {
  const classes = useStyles();

  const getRatingLabel = (ratingValue: number) => {
    switch (ratingValue) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Very High';
      default: return 'Not rated';
    }
  };

  return (
    <div className={classes.ratingSection}>
      <Typography className={classes.ratingTitle}>
        {label === 'Uncertainty Level' ? <Help /> : <TrendingUp />}
        {label}
      </Typography>
      <Typography className={classes.ratingDescription}>
        {description}
      </Typography>
      <div className={classes.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconButton
            key={star}
            size="small"
            onClick={() => onRatingChange(star)}
            className={`${classes.starButton} ${
              star <= rating ? classes.starActive : classes.starInactive
            }`}
          >
            <Star fontSize="large" />
          </IconButton>
        ))}
        <Typography className={classes.ratingLabel}>
          {getRatingLabel(rating)}
        </Typography>
      </div>
    </div>
  );
};

// Enhanced Input Component
export const CreateHypothesis = () => {
  const classes = useStyles();
  const [text, setText] = useState('');
  const [uncertaintyRating, setUncertaintyRating] = useState(0);
  const [impactRating, setImpactRating] = useState(0);
  const [owner, setOwner] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const isFormValid = text.trim().length > 0 && uncertaintyRating > 0 && impactRating > 0 && owner;

  const handleSubmit = () => {
    const hypothesisData = {
      text: text.trim(),
      uncertaintyRating,
      impactRating,
      owner,
      timestamp: new Date().toISOString(),
    };

    // Reset form
    setText('');
    setUncertaintyRating(0);
    setImpactRating(0);
    setOwner('');

    // Show success message
    setShowSuccess(true);
  };

  return (
    <>
      <Paper className={classes.formContainer} elevation={0}>
        <Typography className={classes.formTitle}>
          <Add />
          Create New Hypothesis
        </Typography>
        <Typography className={classes.formSubtitle}>
          Define your hypothesis and assess its uncertainty and potential impact
        </Typography>

        <div className={classes.formGrid}>
          <div className={classes.fullWidth}>
            <TextField
              label="What is your hypothesis?"
              variant="outlined"
              value={text}
              onChange={(e) => setText(e.target.value)}
              fullWidth
              multiline
              rows={4}
              placeholder="e.g., Implementing dark mode will increase user engagement by 15%"
              className={classes.inputField}
              helperText={`${text.length}/500 characters`}
            />
            {text.length > 0 && text.length < 20 && (
              <Typography className={`${classes.validationMessage} ${classes.validationError}`}>
                ⚠️ Please provide a more detailed hypothesis (at least 20 characters)
              </Typography>
            )}
            {text.length >= 20 && (
              <Typography className={`${classes.validationMessage} ${classes.validationSuccess}`}>
                ✅ Great! Your hypothesis is well-defined
              </Typography>
            )}
          </div>

          <FormControl fullWidth className={classes.inputField}>
            <InputLabel>Owner/Team</InputLabel>
            <Select
              value={owner}
              onChange={(e) => setOwner(e.target.value as string)}
              label="Owner/Team"
            >
              <MenuItem value="UI/UX Team">UI/UX Team</MenuItem>
              <MenuItem value="Product Team">Product Team</MenuItem>
              <MenuItem value="Engineering Team">Engineering Team</MenuItem>
              <MenuItem value="Mobile Team">Mobile Team</MenuItem>
              <MenuItem value="Growth Team">Growth Team</MenuItem>
              <MenuItem value="Infrastructure Team">Infrastructure Team</MenuItem>
              <MenuItem value="International Team">International Team</MenuItem>
            </Select>
          </FormControl>

          <div className={classes.fullWidth}>
            <StarRating
              rating={uncertaintyRating}
              onRatingChange={setUncertaintyRating}
              label="Uncertainty Level"
              description="How confident are you about this hypothesis? Higher uncertainty means more research/testing needed."
            />
          </div>

          <div className={classes.fullWidth}>
            <StarRating
              rating={impactRating}
              onRatingChange={setImpactRating}
              label="Potential Impact"
              description="How significant would the impact be if this hypothesis is correct? Consider business value and user benefit."
            />
          </div>

          <div className={classes.fullWidth}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" style={{ color: 'white', marginBottom: '8px' }}>
                  Summary
                </Typography>
                <Box display="flex" flexWrap="wrap" style={{ gap: '4px' }}>
                  {uncertaintyRating > 0 && (
                    <Chip
                      label={`Uncertainty: ${uncertaintyRating}/5`}
                      className={classes.chip}
                      size="small"
                    />
                  )}
                  {impactRating > 0 && (
                    <Chip
                      label={`Impact: ${impactRating}/5`}
                      className={classes.chip}
                      size="small"
                    />
                  )}
                  {owner && (
                    <Chip
                      label={`Owner: ${owner}`}
                      className={classes.chip}
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!isFormValid}
                className={classes.submitButton}
                size="large"
              >
                Submit Hypothesis
              </Button>
            </Box>
          </div>
        </div>
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success">
          Hypothesis submitted successfully! 🎉
        </Alert>
      </Snackbar>
    </>
  );
};
