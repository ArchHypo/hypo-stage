import { Typography, IconButton } from '@material-ui/core';
import TrendingUp from '@material-ui/icons/TrendingUp';
import Help from '@material-ui/icons/Help';
import { useStyles } from '../hooks/useStyles';

type LikertScaleProps = {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
  description: string;
};

export const LikertScale = ({
  rating,
  onRatingChange,
  label,
  description
}: LikertScaleProps) => {
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
        {[1, 2, 3, 4, 5].map((point) => (
          <IconButton
            key={point}
            size="small"
            onClick={() => onRatingChange(point)}
            className={`${classes.starButton} ${
              point <= rating ? classes.starActive : classes.starInactive
            }`}
          >
            {point}
          </IconButton>
        ))}
        <Typography className={classes.ratingLabel}>
          {getRatingLabel(rating)}
        </Typography>
      </div>
    </div>
  );
};
