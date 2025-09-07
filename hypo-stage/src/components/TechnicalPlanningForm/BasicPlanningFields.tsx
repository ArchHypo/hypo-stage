import { Grid } from '@material-ui/core';
import { CustomSelectField, CustomTextField } from '../FormField';
import { EntityRefSelect } from '../EntityRefSelect';
import { ACTION_TYPE_OPTIONS } from '../../utils/constants';
import { ActionType } from '@internal/plugin-hypo-stage-backend';

interface BasicPlanningFieldsProps {
  entityRef: string;
  onEntityRefChange: (value: string) => void;
  actionType: ActionType | '';
  onActionTypeChange: (value: ActionType | '') => void;
  targetDate: string;
  onTargetDateChange: (value: string) => void;
  availableEntityRefs: string[];
  className?: string;
}

export const BasicPlanningFields: React.FC<BasicPlanningFieldsProps> = ({
  entityRef,
  onEntityRefChange,
  actionType,
  onActionTypeChange,
  targetDate,
  onTargetDateChange,
  availableEntityRefs,
  className
}) => {
  return (
    <Grid container spacing={2} className={className}>
      <Grid item xs={12} md={6}>
        <EntityRefSelect
          value={entityRef}
          onChange={onEntityRefChange}
          label="Owner"
          required
          availableEntityRefs={availableEntityRefs}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <CustomSelectField
          label="Action Type"
          value={actionType}
          onChange={(value) => onActionTypeChange(value as ActionType | '')}
          options={ACTION_TYPE_OPTIONS}
          required
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <CustomTextField
          label="Target Date"
          value={targetDate}
          onChange={onTargetDateChange}
          type="date"
          required
          helperText="Required: Target date for completion"
        />
      </Grid>
    </Grid>
  );
};
