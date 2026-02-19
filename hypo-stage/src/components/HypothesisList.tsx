import { default as React, useState } from 'react';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Button,
  TextField,
  Box,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { parseEntityRef } from '@backstage/catalog-model';
import DeleteIcon from '@material-ui/icons/Delete';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { Hypothesis } from '@archhypo/plugin-hypo-stage-backend';
import { useStyles, getStatusClass, getUncertaintyClass, getImpactClass } from '../hooks/useStyles';
import { getHypothesisFocusTag } from '../utils/hypothesisFocus';
import { useNotifications } from '../providers/NotificationProvider';
import { EntityRefLinks } from './EntityRefLinks';
import { HypothesisListDashboard } from './HypothesisListDashboard';

type DenseTableProps = {
  hypotheses: Hypothesis[];
  onDeleteClick: (hypothesis: Hypothesis) => void;
};

export const DenseTable = ({ hypotheses, onDeleteClick }: DenseTableProps) => {
  const classes = useStyles();

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  type TableRow = { createdAt: number; _hypothesis: Hypothesis };
  const columns: TableColumn<TableRow>[] = [
    { title: 'Hypothesis', field: 'statement' },
    {
      title: 'Focus',
      field: 'focus',
      render: (row: TableRow) => {
        const tag = getHypothesisFocusTag(row._hypothesis);
        if (!tag) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
        if (tag === 'need-attention') {
          return (
            <span className={`${classes.statusChip} ${classes.focusChipNeedAttention}`}>
              Needs attention
            </span>
          );
        }
        return (
          <span className={`${classes.statusChip} ${classes.focusChipCanPostpone}`}>
            Can postpone
          </span>
        );
      },
    },
    {
      title: 'Components',
      field: 'entityRefs',
      render: (row: TableRow) => (
        <EntityRefLinks
          entityRefs={row._hypothesis.entityRefs ?? []}
          compact
        />
      ),
    },
    { title: 'Uncertainty', field: 'uncertainty' },
    { title: 'Impact', field: 'impact' },
    { title: 'Status', field: 'status' },
    { title: 'Source Type', field: 'sourceType' },
    {
      title: 'Created',
      field: 'createdAt',
      render: (row: TableRow) => formatDateTime(new Date(row.createdAt)),
    },
    {
      title: 'Actions',
      field: 'actions',
      sorting: false,
      render: (row: TableRow) => (
        <IconButton
          aria-label="Delete hypothesis"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(row._hypothesis);
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const data = hypotheses.map(hypothesis => {
    return {
      statement: (
        <a
          href={`/hypo-stage/hypothesis/${hypothesis.id}`}
          className={classes.linkText}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `/hypo-stage/hypothesis/${hypothesis.id}`;
          }}
        >
          {hypothesis.statement}
        </a>
      ),
      uncertainty: (
        <span className={`${classes.statusChip} ${getUncertaintyClass(hypothesis.uncertainty, classes)}`}>
          {hypothesis.uncertainty}
        </span>
      ),
      impact: (
        <span className={`${classes.statusChip} ${getImpactClass(hypothesis.impact, classes)}`}>
          {hypothesis.impact}
        </span>
      ),
      status: (
        <span className={`${classes.statusChip} ${getStatusClass(hypothesis.status, classes)}`}>
          {hypothesis.status}
        </span>
      ),
      sourceType: hypothesis.sourceType,
      createdAt: new Date(hypothesis.createdAt).getTime(),
      _hypothesis: hypothesis,
    };
  });

  return (
    <Box className={classes.tableWrapper} data-testid="hypothesis-table-wrapper">
      <Table
        title="Hypotheses"
        options={{
          search: false,
          paging: false,
          sorting: true,
          padding: 'dense',
          toolbar: true,
        }}
        columns={columns}
        data={data}
      />
    </Box>
  );
};

interface HypothesisListProps {
  refreshKey?: number;
  /** When set, only hypotheses that reference this component are shown (e.g. on catalog entity tab). */
  entityRef?: string;
}

function entityRefToLabel(ref: string): string {
  try {
    const { name } = parseEntityRef(ref, { defaultKind: 'component', defaultNamespace: 'default' });
    return name;
  } catch {
    return ref;
  }
}

export const HypothesisList = ({ refreshKey = 0, entityRef }: HypothesisListProps) => {
  const classes = useStyles();
  const hypoStageApi = useApi(HypoStageApiRef);
  const { showSuccess, showError } = useNotifications();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [deleteDialogHypothesis, setDeleteDialogHypothesis] = useState<Hypothesis | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedComponentRef, setSelectedComponentRef] = useState<string | null>(null);
  type FocusFilterValue = 'all' | 'need-attention' | 'can-postpone' | 'none';
  const [focusFilter, setFocusFilter] = useState<FocusFilterValue>('all');

  const focusFilterOptions: { value: FocusFilterValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'need-attention', label: 'Need attention' },
    { value: 'can-postpone', label: 'Can postpone' },
    { value: 'none', label: 'No tag' },
  ];

  const { value: teams, loading: teamsLoading } = useAsync(
    () => (entityRef ? Promise.resolve([]) : hypoStageApi.getTeams()),
    [entityRef],
  );
  const teamList = teams ?? [];

  const { value: referencedRefs, loading: refsLoading } = useAsync(
    () => (entityRef ? Promise.resolve([]) : hypoStageApi.getReferencedEntityRefs()),
    [entityRef],
  );
  const componentRefList = referencedRefs ?? [];

  const { value, loading, error } = useAsync(async (): Promise<Hypothesis[]> => {
    return hypoStageApi.getHypotheses({
      ...(entityRef && { entityRef }),
      ...(!entityRef && selectedTeam !== null && { team: selectedTeam }),
      ...(!entityRef && selectedComponentRef !== null && { entityRef: selectedComponentRef }),
    });
  }, [refreshKey, refreshTrigger, entityRef, selectedTeam, selectedComponentRef]);

  const handleDeleteClick = (hypothesis: Hypothesis) => {
    setDeleteDialogHypothesis(hypothesis);
    setDeleteConfirmText('');
  };

  const handleDeleteCancel = () => {
    setDeleteDialogHypothesis(null);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialogHypothesis) return;
    setIsDeleting(true);
    try {
      await hypoStageApi.deleteHypothesis(deleteDialogHypothesis.id);
      showSuccess('Hypothesis and all its technical planning have been deleted.');
      setDeleteDialogHypothesis(null);
      setDeleteConfirmText('');
      setRefreshTrigger((t) => t + 1);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete hypothesis');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const sortedHypotheses = (value || []).slice().sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  const filteredHypotheses = sortedHypotheses.filter(h => {
    const tag = getHypothesisFocusTag(h);
    if (focusFilter === 'all') return true;
    if (focusFilter === 'need-attention') return tag === 'need-attention';
    if (focusFilter === 'can-postpone') return tag === 'can-postpone';
    return tag === null;
  });

  return (
    <>
      <HypothesisListDashboard
        entityRef={entityRef}
        selectedTeam={selectedTeam}
        selectedComponentRef={selectedComponentRef}
        refreshKey={refreshKey + refreshTrigger}
        sinceDays={90}
      />
      <Box className={classes.filterBar} data-testid="hypothesis-filter-bar">
        {!entityRef && (
          <>
            <Autocomplete
              size="small"
              options={teamList}
              value={selectedTeam}
              onChange={(_e, v) => setSelectedTeam(v)}
              getOptionLabel={(option) => option}
              loading={teamsLoading}
              style={{ minWidth: 160, maxWidth: 280 }}
              renderInput={(params) => (
                <TextField {...params} label="Team" variant="outlined" placeholder="All teams" fullWidth />
              )}
            />
            <Autocomplete
              size="small"
              options={componentRefList}
              value={selectedComponentRef}
              onChange={(_e, v) => setSelectedComponentRef(v)}
              getOptionLabel={(option) => entityRefToLabel(option)}
              loading={refsLoading}
              style={{ minWidth: 160, maxWidth: 300 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Component"
                  variant="outlined"
                  placeholder="All components"
                  fullWidth
                />
              )}
            />
          </>
        )}
        <Autocomplete
          size="small"
          options={focusFilterOptions}
          value={focusFilterOptions.find(o => o.value === focusFilter) ?? focusFilterOptions[0]}
          onChange={(_e, v) => setFocusFilter((v?.value ?? 'all') as FocusFilterValue)}
          getOptionLabel={(option) => option.label}
          style={{ minWidth: 140, maxWidth: 220 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Focus"
              variant="outlined"
              placeholder="All"
              fullWidth
              inputProps={{ ...params.inputProps, 'aria-label': 'Filter by focus type' }}
            />
          )}
        />
      </Box>
      <DenseTable hypotheses={filteredHypotheses} onDeleteClick={handleDeleteClick} />
      {deleteDialogHypothesis && (
        <Dialog
          open={!!deleteDialogHypothesis}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-hypothesis-list-dialog-title"
          aria-describedby="delete-hypothesis-list-dialog-description"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="delete-hypothesis-list-dialog-title">
            Delete hypothesis?
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-hypothesis-list-dialog-description">
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
                {deleteDialogHypothesis.statement}
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
              disabled={isDeleting || deleteConfirmText.trim() !== deleteDialogHypothesis.statement}
              startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};
