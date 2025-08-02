import { makeStyles } from '@material-ui/core/styles';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { Hypothesis } from '../types/hypothesis';




const useStyles = makeStyles({
  statusChip: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusInProgress: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusValidated: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusPlanning: {
    backgroundColor: '#cce5ff',
    color: '#004085',
  },
  statusTesting: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusCompleted: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  statusResearch: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  uncertaintyVeryHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  uncertaintyHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  uncertaintyMedium: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  uncertaintyLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  uncertaintyVeryLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  impactVeryHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontWeight: 'bold',
  },
  impactHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontWeight: 'bold',
  },
  impactMedium: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  impactLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  impactVeryLow: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
});

type DenseTableProps = {
  hypotheses: Hypothesis[];
};

export const DenseTable = ({ hypotheses }: DenseTableProps) => {
  const classes = useStyles();

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'In Progress':
        return classes.statusInProgress;
      case 'Validated':
        return classes.statusValidated;
      case 'Planning':
        return classes.statusPlanning;
      case 'Testing':
        return classes.statusTesting;
      case 'Completed':
        return classes.statusCompleted;
      case 'Research':
        return classes.statusResearch;
      default:
        return classes.statusInProgress;
    }
  };

  const getUncertaintyClass = (uncertainty: string) => {
    switch (uncertainty) {
      case 'Very High':
        return classes.uncertaintyVeryHigh;
      case 'High':
        return classes.uncertaintyHigh;
      case 'Medium':
        return classes.uncertaintyMedium;
      case 'Low':
        return classes.uncertaintyLow;
      case 'Very Low':
        return classes.uncertaintyVeryLow;
      default:
        return classes.uncertaintyMedium;
    }
  };

  const getImpactClass = (impact: string) => {
    switch (impact) {
      case 'Very High':
        return classes.impactVeryHigh;
      case 'High':
        return classes.impactHigh;
      case 'Medium':
        return classes.impactMedium;
      case 'Low':
        return classes.impactLow;
      case 'Very Low':
        return classes.impactVeryLow;
      default:
        return classes.impactMedium;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  const columns: TableColumn[] = [
    { title: 'Hypothesis', field: 'text' },
    { title: 'Uncertainty', field: 'uncertainty' },
    { title: 'Impact', field: 'impact' },
    { title: 'Status', field: 'status' },
    { title: 'Entity Ref', field: 'entityRef' },
    { title: 'Created', field: 'createdAt' },
  ];

  const data = hypotheses.map(hypothesis => {
    return {
      text: (
        <a
          href={`/hypo-stage/technical-planning/${hypothesis.id}`}
          style={{
            color: '#007bff',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          onClick={(e) => {
            e.preventDefault();
            window.open(`/hypo-stage/technical-planning/${hypothesis.id}`, '_blank');
          }}
        >
          {hypothesis.text}
        </a>
      ),
      uncertainty: (
        <span className={`${classes.statusChip} ${getUncertaintyClass(hypothesis.uncertainty)}`}>
          {hypothesis.uncertainty}
        </span>
      ),
      impact: (
        <span className={`${classes.statusChip} ${getImpactClass(hypothesis.impact)}`}>
          {hypothesis.impact}
        </span>
      ),
      status: (
        <span className={`${classes.statusChip} ${getStatusClass(hypothesis.status)}`}>
          {hypothesis.status}
        </span>
      ),
      entityRef: hypothesis.entityRef,
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

interface ListHypothesesProps {
  refreshKey?: number;
}

export const ListHypotheses = ({ refreshKey = 0 }: ListHypothesesProps) => {
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
