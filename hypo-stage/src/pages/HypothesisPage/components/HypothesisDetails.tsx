import { Card, CardContent, Typography, Divider, Box } from '@material-ui/core';
import Assessment from '@material-ui/icons/Assessment';
import Description from '@material-ui/icons/Description';
import Link from '@material-ui/icons/Link';
import Notes from '@material-ui/icons/Notes';
import { StatusChip } from '../../../components/StatusChip';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';
import { useStyles } from '../../../hooks/useStyles';

interface HypothesisDetailsProps {
  hypothesis: Hypothesis;
  className?: string;
}

export const HypothesisDetails: React.FC<HypothesisDetailsProps> = ({
  hypothesis,
  className
}) => {
  const classes = useStyles();
  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h5" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Description />
          Hypothesis Statement
        </Typography>
        <Typography variant="body1" paragraph>
          {hypothesis.statement}
        </Typography>

        <Divider className={classes.divider} />

        <Typography variant="h6" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Assessment />
          Assessment
        </Typography>
        <Box className={`${classes.flexWrap} ${classes.marginBottom}`}>
          <StatusChip value={hypothesis.uncertainty} type="uncertainty" />
          <StatusChip value={hypothesis.impact} type="impact" />
          <StatusChip value={hypothesis.status} type="status" />
        </Box>

        <Typography variant="h6" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Link />
          Source Information
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Source Type: {hypothesis.sourceType}
        </Typography>

        {hypothesis.notes && (
          <>
            <Divider className={classes.divider} />
            <Typography variant="h6" style={{
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Notes />
              Notes
            </Typography>
            <Typography variant="body2">
              {hypothesis.notes}
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};
