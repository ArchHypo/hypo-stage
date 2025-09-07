import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import Assessment from '@material-ui/icons/Assessment';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';

interface QualityAttributesCardProps {
  hypothesis: Hypothesis;
  className?: string;
}

export const QualityAttributesCard: React.FC<QualityAttributesCardProps> = ({
  hypothesis,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent>
        <Typography variant="h6" style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Assessment />
          Quality Attributes
        </Typography>
        {hypothesis.qualityAttributes.length > 0 ? (
          <List dense>
            {hypothesis.qualityAttributes.map((attr: string, index: number) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Assessment fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={attr} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No quality attributes defined
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
