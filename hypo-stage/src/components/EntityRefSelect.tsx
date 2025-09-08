import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  Chip
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { HypoStageApiRef } from '../api/HypoStageApi';
import { useStyles } from '../hooks/useStyles';

interface EntityRefMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const EntityRefMultiSelect: React.FC<EntityRefMultiSelectProps> = ({
  value,
  onChange,
  label = 'Entity References',
  required = false,
  disabled = false,
  className
}) => {
  const classes = useStyles();
  const hypoStageApi = useApi(HypoStageApiRef);

  const { value: entityRefs, loading, error } = useAsync(
    async (): Promise<string[]> => hypoStageApi.getEntityRefs(),
    []
  );

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string[]);
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" className={classes.loadingText}>
          Loading entity refs...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error" variant="body2">
          Error loading entity refs: {error.message}
        </Typography>
      </Box>
    );
  }

  return (
    <FormControl fullWidth className={className} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={handleChange}
        label={label}
        disabled={disabled}
        renderValue={(selected) => (
          <Box className={classes.flexWrap}>
            {(selected as string[]).map((entityRef) => (
              <Chip key={entityRef} label={entityRef} size="small" className={classes.smallChip} />
            ))}
          </Box>
        )}
      >
        {entityRefs?.map((entityRef) => (
          <MenuItem key={entityRef} value={entityRef}>
            {entityRef}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
