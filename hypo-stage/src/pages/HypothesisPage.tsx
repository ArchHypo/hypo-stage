import { default as React, useState } from 'react';
import {
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  TextField,
  Box,
} from '@material-ui/core';
import {
  Header,
  Page,
  Content,
  HeaderLabel,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useHypothesisData } from '../hooks/useHypothesisData';
import { formatDate } from '../utils/formatters';
import { HypothesisDetails } from './HypothesisPage/components/HypothesisDetails';
import { QualityAttributesCard } from './HypothesisPage/components/QualityAttributesCard';
import { RelatedArtefactsCard } from './HypothesisPage/components/RelatedArtefactsCard';
import { TechnicalPlanningList } from '../components/TechnicalPlanningList';
import { EvolutionChart } from './HypothesisPage/components/EvolutionChart';
import { NotificationProvider } from '../providers/NotificationProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useStyles } from '../hooks/useStyles';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useNotifications } from '../providers/NotificationProvider';
import ArrowBack from '@material-ui/icons/ArrowBack';
import Edit from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import { Hypothesis, HypothesisEvent } from '@internal/plugin-hypo-stage-backend';

/** Inner content that uses useNotifications; must be rendered inside NotificationProvider. */
const HypothesisPageContent = ({
  hypothesis,
  events,
  refreshHypothesis,
}: {
  hypothesis: Hypothesis;
  events: HypothesisEvent[];
  refreshHypothesis: () => void;
}) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const hypoStageApi = useApi(HypoStageApiRef);
  const { showSuccess, showError } = useNotifications();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await hypoStageApi.deleteHypothesis(hypothesis.id);
      showSuccess('Hypothesis and all its technical planning have been deleted.');
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
      navigate('/hypo-stage');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete hypothesis');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Page themeId="tool">
        <Header title="Hypothesis Dashboard" subtitle={`ID: ${hypothesis.id}`}>
          <HeaderLabel label="Status" value={hypothesis.status} />
          <HeaderLabel label="Created" value={formatDate(hypothesis.createdAt)} />
          <HeaderLabel label="Updated" value={formatDate(hypothesis.updatedAt)} />
        </Header>

        <Content>
          <Box className={classes.actionBar} data-testid="hypothesis-action-bar">
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/hypo-stage')}
            >
              Back to List
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Edit />}
              onClick={() => navigate(`/hypo-stage/hypothesis/${hypothesis.id}/edit`)}
            >
              Edit Hypothesis
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </Box>

          <Grid container spacing={3} style={{ width: '100%', margin: 0 }}>
            {/* Main Hypothesis Information */}
            <Grid item xs={12} md={8} style={{ minWidth: 0 }}>
              <HypothesisDetails hypothesis={hypothesis} />
            </Grid>

            {/* Sidebar Information - Full Width */}
            <Grid item xs={12} md={4} style={{ minWidth: 0 }}>
              <QualityAttributesCard hypothesis={hypothesis} />
            </Grid>

            <Grid item xs={12}>
              <RelatedArtefactsCard hypothesis={hypothesis} />
            </Grid>

            {/* Evolution Chart Section */}
            <Grid item xs={12}>
              <EvolutionChart hypothesis={hypothesis} events={events} />
            </Grid>

            {/* Technical Planning Section */}
            <Grid item xs={12}>
              <TechnicalPlanningList hypothesis={hypothesis} onRefresh={refreshHypothesis} />
            </Grid>
          </Grid>

          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteCancel}
            aria-labelledby="delete-hypothesis-dialog-title"
            aria-describedby="delete-hypothesis-dialog-description"
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle id="delete-hypothesis-dialog-title">
              Delete hypothesis?
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="delete-hypothesis-dialog-description">
                This will permanently delete this hypothesis and all its technical planning. This action cannot be undone.
              </DialogContentText>
              <DialogContentText>
                To confirm, type the complete hypothesis name below. Copy and paste is not allowed.
              </DialogContentText>
              <Box mt={2} mb={1}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="Type the hypothesis name here..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  inputProps={{
                    'aria-label': 'Confirm hypothesis name',
                    'data-testid': 'delete-hypothesis-confirm-input',
                  }}
                  disabled={isDeleting}
                />
              </Box>
              <DialogContentText variant="body2" color="textSecondary" component="div">
                <strong>Reference — type this exactly:</strong>
                <Box component="p" style={{ wordBreak: 'break-word', userSelect: 'none' }}>
                  {hypothesis.statement}
                </Box>
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
                disabled={isDeleting || deleteConfirmText.trim() !== hypothesis.statement}
                startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogActions>
          </Dialog>
        </Content>
      </Page>
  );
};

export const HypothesisPage = () => {
  const { hypothesisId } = useParams<{ hypothesisId: string }>();
  const { hypothesis, events, loading, error, refreshHypothesis } = useHypothesisData(hypothesisId);

  if (loading) {
    return <Progress />;
  }

  if (error || !hypothesis) {
    return <ResponseErrorPanel error={error || new Error('Hypothesis not found')} />;
  }

  return (
    <NotificationProvider>
      <HypothesisPageContent
        hypothesis={hypothesis}
        events={events}
        refreshHypothesis={refreshHypothesis}
      />
    </NotificationProvider>
  );
};
