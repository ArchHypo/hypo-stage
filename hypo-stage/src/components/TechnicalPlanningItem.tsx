import { default as React, useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import { useApi } from '@backstage/core-plugin-api';
import { useStyles } from '../hooks/useStyles';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { TechnicalPlanningForm } from './TechnicalPlanningForm';
import { useEditTechnicalPlanning } from '../hooks/forms/useEditTechnicalPlanning';
import { TechnicalPlanning, Hypothesis } from '@archhypo/plugin-hypo-stage-backend';

interface TechnicalPlanningItemProps {
  technicalPlanning: TechnicalPlanning;
  hypothesis: Hypothesis;
  index: number;
  onRefresh: () => Promise<void>;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
}

export const TechnicalPlanningItem: React.FC<TechnicalPlanningItemProps> = ({
  technicalPlanning,
  hypothesis,
  index,
  onRefresh,
  isEditing,
  onEditStart,
  onEditEnd,
}) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);
  const { formData, updateField, loading, isFormValid, handleSubmit } = useEditTechnicalPlanning(
    technicalPlanning,
    hypothesis.uncertainty,
    hypothesis.impact,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.deleteTechnicalPlanning(technicalPlanning.id);
      setDeleteDialogOpen(false);
      onEditEnd();
      await onRefresh();
    } catch (err) {
      // Error handling is done by the notification system
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleEditSubmit = () => {
    handleSubmit(technicalPlanning.id, async () => {
      onEditEnd();
      await onRefresh();
    });
  };

  const handleEditCancel = () => {
    onEditEnd();
  };

  return (
    <>
      <Paper variant="outlined" className={classes.paperContainer}>
        <Box className={`${classes.flexBetween} ${classes.marginBottom} ${classes.technicalPlanningHeader}`}>
          <Typography variant="h6" style={{ flexShrink: 0 }}>
            Technical Planning #{index + 1}
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={onEditStart}
              disabled={isEditing}
              className={classes.marginRight}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              disabled={isEditing}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {isEditing ? (
          <TechnicalPlanningForm
            mode="edit"
            technicalPlanning={technicalPlanning}
            formData={formData}
            onFieldChange={updateField}
            isFormValid={isFormValid}
            loading={loading}
            onSubmit={handleEditSubmit}
            onCancel={handleEditCancel}
          />
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Planning ID
              </Typography>
              <Typography
                variant="body2"
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: 2, marginBottom: 8 }}
              >
                {technicalPlanning.id}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Owner
              </Typography>
              <Typography variant="body2" paragraph>
                {technicalPlanning.entityRef}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Action Type
              </Typography>
              <Typography variant="body2" paragraph>
                {technicalPlanning.actionType}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Target Date
              </Typography>
              <Typography variant="body2" paragraph>
                {new Date(technicalPlanning.targetDate).toLocaleDateString()}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" paragraph>
                {technicalPlanning.description}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Expected Outcome
              </Typography>
              <Typography variant="body2" paragraph>
                {technicalPlanning.expectedOutcome}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Documentation
              </Typography>
              <Typography variant="body2" paragraph>
                {technicalPlanning.documentations.map((doc, docIndex) => (
                  <div key={docIndex} className={classes.marginBottom}>
                    <a href={doc} target="_blank" rel="noopener noreferrer">
                      {doc}
                    </a>
                  </div>
                ))}
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Technical Planning
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this technical planning entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="secondary"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
