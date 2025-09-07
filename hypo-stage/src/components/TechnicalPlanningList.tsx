import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@material-ui/core';
import Timeline from '@material-ui/icons/Timeline';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import { useApi } from '@backstage/core-plugin-api';
import { useStyles } from '../hooks/useStyles';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { TechnicalPlanningForm } from './TechnicalPlanningForm';
import { useCreateTechnicalPlanning } from '../hooks/forms/useCreateTechnicalPlanning';
import { useEditTechnicalPlanning } from '../hooks/forms/useEditTechnicalPlanning';
import { Hypothesis, TechnicalPlanning } from '@internal/plugin-hypo-stage-backend';

interface TechnicalPlanningListProps {
  hypothesis: Hypothesis;
  onRefresh: () => void;
}

export const TechnicalPlanningList: React.FC<TechnicalPlanningListProps> = ({
  hypothesis,
  onRefresh
}) => {
  const classes = useStyles();
  const api = useApi(HypoStageApiRef);
  const [showTechnicalPlanningForm, setShowTechnicalPlanningForm] = useState(false);
  const [editingTechnicalPlanning, setEditingTechnicalPlanning] = useState<TechnicalPlanning | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [technicalPlanningToDelete, setTechnicalPlanningToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create form hook
  const createForm = useCreateTechnicalPlanning(hypothesis.id);

  // Edit form hook - always initialize but only use when editing
  const editForm = useEditTechnicalPlanning(editingTechnicalPlanning || {
    id: '',
    entityRef: '',
    actionType: 'Other',
    description: '',
    expectedOutcome: '',
    documentations: [],
    targetDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  } as TechnicalPlanning);

  const handleDeleteClick = (technicalPlanningId: string) => {
    setTechnicalPlanningToDelete(technicalPlanningId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!technicalPlanningToDelete) return;

    setIsDeleting(true);
    try {
      await api.deleteTechnicalPlanning(technicalPlanningToDelete);
      setDeleteDialogOpen(false);
      setTechnicalPlanningToDelete(null);
      onRefresh();
    } catch (err) {
      // Error handling is done by the notification system
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTechnicalPlanningToDelete(null);
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Timeline />
            Technical Planning
          </Typography>

          {hypothesis.technicalPlannings && hypothesis.technicalPlannings.length > 0 ? (
            <Grid container spacing={3}>
              {hypothesis.technicalPlannings.map((techPlan, index) => (
                <Grid item xs={12} key={techPlan.id}>
                  <Paper variant="outlined" className={classes.paperContainer}>
                    <Box className={`${classes.flexBetween} ${classes.marginBottom}`}>
                      <Typography variant="h6">
                        Technical Planning #{index + 1}
                      </Typography>
                      <Box display="flex">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => setEditingTechnicalPlanning(techPlan)}
                          disabled={editingTechnicalPlanning?.id === techPlan.id}
                          className={classes.marginRight}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteClick(techPlan.id)}
                          disabled={editingTechnicalPlanning?.id === techPlan.id}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>

                    {editingTechnicalPlanning?.id === techPlan.id ? (
                      <TechnicalPlanningForm
                        mode="edit"
                        technicalPlanning={techPlan}
                        formData={editForm.formData}
                        onFieldChange={editForm.updateField}
                        isFormValid={editForm.isFormValid}
                        loading={editForm.loading}
                        onSubmit={() => {
                          editForm.handleSubmit(() => {
                            setEditingTechnicalPlanning(null);
                            onRefresh();
                          });
                        }}
                      />
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>
                            Action Type
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {techPlan.actionType}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>
                            Target Date
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {new Date(techPlan.targetDate).toLocaleDateString()}
                          </Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Description
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {techPlan.description}
                          </Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Expected Outcome
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {techPlan.expectedOutcome}
                          </Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Owner
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {techPlan.entityRef}
                          </Typography>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Documentation
                          </Typography>
                          <Typography variant="body2" paragraph>
                            {techPlan.documentations.map((doc, docIndex) => (
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
                </Grid>
              ))}

              {/* Add another technical planning button */}
              {!showTechnicalPlanningForm && (
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setShowTechnicalPlanningForm(true)}
                    className={classes.marginTop}
                  >
                    Add Another Technical Planning
                  </Button>
                </Grid>
              )}
            </Grid>
          ) : (
            <Box>
              <Typography variant="body2" color="textSecondary" className={classes.marginBottom}>
                No technical planning information available
              </Typography>
              {!showTechnicalPlanningForm && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowTechnicalPlanningForm(true)}
                >
                  Add Technical Planning
                </Button>
              )}
            </Box>
          )}

          {showTechnicalPlanningForm && (
            <Box className={classes.marginTopLarge}>
              <TechnicalPlanningForm
                mode="create"
                hypothesisId={hypothesis.id}
                availableEntityRefs={hypothesis.entityRefs}
                formData={createForm.formData}
                onFieldChange={createForm.updateField}
                isFormValid={createForm.isFormValid}
                loading={createForm.loading}
                onSubmit={() => {
                  createForm.handleSubmit(() => {
                    setShowTechnicalPlanningForm(false);
                    onRefresh();
                  });
                }}
              />
              <Button
                variant="outlined"
                onClick={() => setShowTechnicalPlanningForm(false)}
                className={classes.marginTop}
              >
                Cancel Adding Technical Planning
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

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
