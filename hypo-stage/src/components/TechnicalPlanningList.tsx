import React from 'react';
import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button
} from '@material-ui/core';
import Timeline from '@material-ui/icons/Timeline';
import { useStyles } from '../hooks/useStyles';
import { TechnicalPlanningForm } from './TechnicalPlanningForm';
import { TechnicalPlanningItem } from './TechnicalPlanningItem';
import { useCreateTechnicalPlanning } from '../hooks/forms/useCreateTechnicalPlanning';
import { Hypothesis } from '@internal/plugin-hypo-stage-backend';

interface TechnicalPlanningListProps {
  hypothesis: Hypothesis;
  onRefresh: () => void;
}

export const TechnicalPlanningList: React.FC<TechnicalPlanningListProps> = ({
  hypothesis,
  onRefresh
}) => {
  const classes = useStyles();
  const { formData, updateField, loading, isFormValid, handleSubmit } = useCreateTechnicalPlanning(hypothesis.id);
  const [showTechnicalPlanningForm, setShowTechnicalPlanningForm] = useState(false);

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

          {hypothesis.technicalPlannings.length > 0 ? (
            <Grid container spacing={3}>
              {hypothesis.technicalPlannings.map((techPlan, index) => (
                <Grid item xs={12} key={techPlan.id}>
                  <TechnicalPlanningItem
                    technicalPlanning={techPlan}
                    index={index}
                    onRefresh={onRefresh}
                  />
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
                formData={formData}
                onFieldChange={updateField}
                isFormValid={isFormValid}
                loading={loading}
                onSubmit={() => {
                  handleSubmit(() => {
                    setShowTechnicalPlanningForm(false);
                    onRefresh();
                  });
                }}
                onCancel={() => setShowTechnicalPlanningForm(false)}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </>
  );
};
