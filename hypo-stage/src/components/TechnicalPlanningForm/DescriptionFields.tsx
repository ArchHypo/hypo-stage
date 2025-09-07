import { Grid } from '@material-ui/core';
import { CustomTextField } from '../FormField';

interface DescriptionFieldsProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  expectedOutcome: string;
  onExpectedOutcomeChange: (value: string) => void;
  className?: string;
}

export const DescriptionFields: React.FC<DescriptionFieldsProps> = ({
  description,
  onDescriptionChange,
  expectedOutcome,
  onExpectedOutcomeChange,
  className
}) => {
  return (
    <Grid container spacing={2} className={className}>
      <Grid item xs={12}>
        <CustomTextField
          label="Description"
          value={description}
          onChange={onDescriptionChange}
          required
          multiline
          rows={3}
          placeholder="Brief description of the technical action"
          helperText={`${description.length}/500 characters`}
        />
      </Grid>

      <Grid item xs={12}>
        <CustomTextField
          label="Expected Outcome"
          value={expectedOutcome}
          onChange={onExpectedOutcomeChange}
          required
          multiline
          rows={3}
          placeholder="What do you expect to learn or achieve?"
          helperText={`${expectedOutcome.length}/500 characters`}
        />
      </Grid>
    </Grid>
  );
};
