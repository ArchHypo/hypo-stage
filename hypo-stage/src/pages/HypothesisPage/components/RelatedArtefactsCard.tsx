import { default as React } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import Link from '@material-ui/icons/Link';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';

interface RelatedArtefactsCardProps {
  hypothesis: Hypothesis;
  className?: string;
}

export const RelatedArtefactsCard: React.FC<RelatedArtefactsCardProps> = ({
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
          <Link />
          Related Artefacts
        </Typography>
        {hypothesis.relatedArtefacts.length > 0 ? (
          <List dense>
            {hypothesis.relatedArtefacts.map((artefact: string, index: number) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Link fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={artefact} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No related artefacts
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
