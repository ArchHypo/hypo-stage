import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';
import { useStyles, getStatusClass, getUncertaintyClass, getImpactClass } from '../hooks/useStyles';

type DenseTableProps = {
  hypotheses: Hypothesis[];
};

export const DenseTable = ({ hypotheses }: DenseTableProps) => {
  const classes = useStyles();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const columns: TableColumn[] = [
    { title: 'Hypothesis', field: 'statement' },
    { title: 'Uncertainty', field: 'uncertainty' },
    { title: 'Impact', field: 'impact' },
    { title: 'Status', field: 'status' },
    { title: 'Source Type', field: 'sourceType' },
    { title: 'Created', field: 'createdAt' },
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
      createdAt: formatDate(hypothesis.createdAt),
    };
  });

  return (
    <Table
      title="Hypotheses"
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
    />
  );
};

interface HypothesisListProps {
  refreshKey?: number;
}

export const HypothesisList = ({ refreshKey = 0 }: HypothesisListProps) => {
  const hypoStageApi = useApi(HypoStageApiRef);

  const { value, loading, error } = useAsync(async (): Promise<Hypothesis[]> => {
    return hypoStageApi.getHypotheses();
  }, [refreshKey]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <DenseTable hypotheses={value || []} />;
};
