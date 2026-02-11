import { default as React } from 'react';
import { Card, CardContent, Typography, Divider, Box, Chip } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import Assessment from '@material-ui/icons/Assessment';
import Description from '@material-ui/icons/Description';
import LinkIcon from '@material-ui/icons/Link';
import Notes from '@material-ui/icons/Notes';
import Warning from '@material-ui/icons/Warning';
import CheckCircle from '@material-ui/icons/CheckCircle';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';
import { getImpactClass, getStatusClass, getUncertaintyClass, useStyles } from '../../../hooks/useStyles';
import { EntityRefLinks } from '../../../components/EntityRefLinks';
import { getHypothesisFocusTag } from '../../../utils/hypothesisFocus';

interface HypothesisDetailsProps {
  hypothesis: Hypothesis;
  className?: string;
}

export const HypothesisDetails: React.FC<HypothesisDetailsProps> = ({
  hypothesis,
  className
}) => {
  const classes = useStyles();
  const focusTag = getHypothesisFocusTag(hypothesis);

  return (
    <>
      {focusTag === 'need-attention' && (
        <Alert
          severity="warning"
          icon={<Warning />}
          style={{ marginBottom: 16 }}
        >
          <strong>This hypothesis needs attention.</strong> High uncertainty and high impact — consider adding or updating a technical plan to reduce uncertainty or impact.
        </Alert>
      )}
      {focusTag === 'can-postpone' && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          style={{ marginBottom: 16 }}
        >
          <strong>This hypothesis can be postponed.</strong> Low impact — safe to delay this architectural decision.
        </Alert>
      )}
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
          <Chip
            label={hypothesis.status}
            className={`${classes.statusChip} ${getStatusClass(hypothesis.status, classes)}`}
          />
          <Chip
            label={hypothesis.uncertainty}
            className={`${classes.statusChip} ${getUncertaintyClass(hypothesis.uncertainty, classes)}`}
          />
          <Chip
            label={hypothesis.impact}
            className={`${classes.statusChip} ${getImpactClass(hypothesis.impact, classes)}`}
          />
          {focusTag !== null && (
            <Chip
              label={focusTag === 'need-attention' ? 'Needs attention' : 'Can postpone'}
              className={`${classes.statusChip} ${
                focusTag === 'need-attention' ? classes.focusChipNeedAttention : classes.focusChipCanPostpone
              }`}
            />
          )}
        </Box>

        <Typography variant="h6" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <LinkIcon />
          Source Information
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Source Type: {hypothesis.sourceType}
        </Typography>

        {hypothesis.entityRefs && hypothesis.entityRefs.length > 0 && (
          <>
            <Box mt={2} mb={1}>
              <EntityRefLinks entityRefs={hypothesis.entityRefs} title="Linked components" />
            </Box>
          </>
        )}

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
    </>
  );
};
