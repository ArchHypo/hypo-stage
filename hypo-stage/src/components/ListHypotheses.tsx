import { makeStyles } from '@material-ui/core/styles';
import {
  Table,
  TableColumn,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { Select, MenuItem } from '@material-ui/core';
import useAsync from 'react-use/lib/useAsync';
import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { Hypothesis } from '../types/hypothesis';


const exampleHypotheses = {
  results: [
    {
      id: 'hypo-001',
      title: 'Implementing dark mode will increase user engagement by 15%',
      description: 'Users prefer dark interfaces for better eye comfort and modern aesthetics',
      uncertainty: 'Medium' as const,
      impact: 'High' as const,
      status: 'In Progress' as const,
      owner: 'UI/UX Team',
      createdDate: '2024-01-15',
      technicalPlanning: 'Architectural Spike' as const,
    },
    {
      id: 'hypo-002',
      title: 'Adding search filters will reduce support tickets by 25%',
      description: 'Users struggle to find content, leading to increased support requests',
      uncertainty: 'Low' as const,
      impact: 'Medium' as const,
      status: 'Validated' as const,
      owner: 'Product Team',
      createdDate: '2024-01-10',
      technicalPlanning: 'Software Analytics' as const,
    },
    {
      id: 'hypo-003',
      title: 'Mobile app will capture 30% of new user registrations',
      description: 'Mobile-first users are currently underserved by web-only platform',
      uncertainty: 'High' as const,
      impact: 'High' as const,
      status: 'Planning' as const,
      owner: 'Mobile Team',
      createdDate: '2024-01-20',
      technicalPlanning: 'Tracer Bullet' as const,
    },
    {
      id: 'hypo-004',
      title: 'Automated onboarding will improve conversion by 20%',
      description: 'Manual onboarding process is too complex and causes drop-offs',
      uncertainty: 'Medium' as const,
      impact: 'Medium' as const,
      status: 'Testing' as const,
      owner: 'Growth Team',
      createdDate: '2024-01-12',
      technicalPlanning: 'Architectural Spike' as const,
    },
    {
      id: 'hypo-005',
      title: 'Real-time notifications will increase feature adoption by 40%',
      description: 'Users miss important updates and new features due to lack of notifications',
      uncertainty: 'Low' as const,
      impact: 'High' as const,
      status: 'Validated' as const,
      owner: 'Engineering Team',
      createdDate: '2024-01-08',
      technicalPlanning: 'Tracer Bullet' as const,
    },
    {
      id: 'hypo-006',
      title: 'Social login will reduce signup friction by 50%',
      description: 'Traditional email signup process has too many steps',
      uncertainty: 'Medium' as const,
      impact: 'Medium' as const,
      status: 'In Progress' as const,
      owner: 'Auth Team',
      createdDate: '2024-01-18',
      technicalPlanning: 'Software Analytics' as const,
    },
    {
      id: 'hypo-007',
      title: 'Performance optimization will improve page load times by 60%',
      description: 'Slow loading pages are causing user frustration and bounce rates',
      uncertainty: 'Low' as const,
      impact: 'High' as const,
      status: 'Completed' as const,
      owner: 'Performance Team',
      createdDate: '2024-01-05',
      technicalPlanning: 'Architectural Spike' as const,
    },
    {
      id: 'hypo-008',
      title: 'Gamification elements will increase daily active users by 35%',
      description: 'Users need more motivation to return to the platform daily',
      uncertainty: 'High' as const,
      impact: 'Medium' as const,
      status: 'Planning' as const,
      owner: 'Product Team',
      createdDate: '2024-01-22',
      technicalPlanning: 'Tracer Bullet' as const,
    },
    {
      id: 'hypo-009',
      title: 'Multi-language support will expand market reach by 200%',
      description: 'Current English-only platform limits international growth',
      uncertainty: 'Medium' as const,
      impact: 'High' as const,
      status: 'Research' as const,
      owner: 'International Team',
      createdDate: '2024-01-14',
      technicalPlanning: 'Software Analytics' as const,
    },
    {
      id: 'hypo-010',
      title: 'API rate limiting will reduce server costs by 30%',
      description: 'Unlimited API usage is causing excessive server load and costs',
      uncertainty: 'Low' as const,
      impact: 'Medium' as const,
      status: 'Testing' as const,
      owner: 'Infrastructure Team',
      createdDate: '2024-01-16',
      technicalPlanning: 'Architectural Spike' as const,
    },
  ],
};

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
  impactHigh: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    fontWeight: 'bold',
  },
  impactMedium: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
});

type DenseTableProps = {
  hypotheses: Hypothesis[];
};

export const DenseTable = ({ hypotheses }: DenseTableProps) => {
  const classes = useStyles();
  const [technicalPlanningValues, setTechnicalPlanningValues] = useState<Record<string, 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics'>>(
    hypotheses.reduce((acc, hypothesis) => {
      acc[hypothesis.id] = hypothesis.technicalPlanning;
      return acc;
    }, {} as Record<string, 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics'>)
  );

  const handleTechnicalPlanningChange = (hypothesisId: string, value: 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics') => {
    setTechnicalPlanningValues(prev => ({
      ...prev,
      [hypothesisId]: value
    }));
  };

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
      case 'High':
        return classes.uncertaintyHigh;
      case 'Medium':
        return classes.uncertaintyMedium;
      case 'Low':
        return classes.uncertaintyLow;
      default:
        return classes.uncertaintyMedium;
    }
  };

  const getImpactClass = (impact: string) => {
    switch (impact) {
      case 'High':
        return classes.impactHigh;
      case 'Medium':
        return classes.impactMedium;
      case 'Low':
        return classes.uncertaintyLow;
      default:
        return classes.impactMedium;
    }
  };

  const columns: TableColumn[] = [
    { title: 'ID', field: 'id' },
    { title: 'Title', field: 'title' },
    { title: 'Uncertainty', field: 'uncertainty' },
    { title: 'Impact', field: 'impact' },
    { title: 'Status', field: 'status' },
    { title: 'Owner', field: 'owner' },
    { title: 'Technical Planning', field: 'technicalPlanning' },
  ];

  const data = hypotheses.map(hypothesis => {
    return {
      id: hypothesis.id,
      title: (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {hypothesis.title}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {hypothesis.description}
          </div>
        </div>
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
      owner: hypothesis.owner,
      technicalPlanning: (
        <Select
          value={technicalPlanningValues[hypothesis.id] || hypothesis.technicalPlanning}
          onChange={(e) => handleTechnicalPlanningChange(hypothesis.id, e.target.value as 'Architectural Spike' | 'Tracer Bullet' | 'Software Analytics')}
          variant="outlined"
          style={{ minWidth: '150px' }}
        >
          <MenuItem value="Architectural Spike">Architectural Spike</MenuItem>
          <MenuItem value="Tracer Bullet">Tracer Bullet</MenuItem>
          <MenuItem value="Software Analytics">Software Analytics</MenuItem>
        </Select>
      ),
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

export const ListHypotheses = () => {
  const hypothesisService = useApi(HypoStageApiRef);

  const { value, loading, error } = useAsync(async (): Promise<Hypothesis[]> => {
    return hypothesisService.getHypotheses();
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return <DenseTable hypotheses={value || []} />;
};
