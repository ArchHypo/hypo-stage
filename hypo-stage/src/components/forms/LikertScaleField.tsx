import { default as React } from 'react';
import { Typography, IconButton } from '@material-ui/core';
import TrendingUp from '@material-ui/icons/TrendingUp';
import Help from '@material-ui/icons/Help';
import { useStyles } from '../../hooks/useStyles';
import { getRatingLabel } from '../../utils/formatters';

interface LikertScaleFieldProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
  description: string;
  className?: string;
}

export const LikertScaleField: React.FC<LikertScaleFieldProps> = ({
  rating,
  onRatingChange,
  label,
  description,
  className
}) => {
  const classes = useStyles();

  return (
    <div className={`${classes.ratingSection} ${className || ''}`}>
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
