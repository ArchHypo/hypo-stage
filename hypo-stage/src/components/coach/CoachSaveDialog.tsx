import { default as React } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core';
import type { HypothesisReview } from '../../api/HypoStageApi';

interface CoachSaveDialogProps {
  review: HypothesisReview | null;
  onSaveAnyway: () => void;
  onBack: () => void;
}

export const CoachSaveDialog = ({ review, onSaveAnyway, onBack }: CoachSaveDialogProps) => {
  const warnings = (review?.issues ?? []).filter(i => i.severity === 'warning');
  return (
    <Dialog open={review !== null} onClose={onBack} aria-labelledby="coach-save-dialog-title">
      <DialogTitle id="coach-save-dialog-title">The coach found issues in this statement</DialogTitle>
      <DialogContent>
        {review && (
          <Typography variant="body2" paragraph>
            {review.classificationReason}
          </Typography>
        )}
        {warnings.map((issue, i) => (
          <Typography key={i} variant="body2" paragraph>
            ⚠ {issue.message}
          </Typography>
        ))}
        <Typography variant="caption" color="textSecondary">
          You can still save it as it is; the suggested rewrites stay available in the form.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onBack} color="primary" variant="contained">
          Back to edit
        </Button>
        <Button onClick={onSaveAnyway}>Save anyway</Button>
      </DialogActions>
    </Dialog>
  );
};
