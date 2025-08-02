import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Box
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import useAsync from 'react-use/lib/useAsync';
import { HypoStageApiRef } from '../api/HypoStageApi';

interface EntityRefSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const EntityRefSelect: React.FC<EntityRefSelectProps> = ({
  value,
  onChange,
  label = 'Owner/Team',
  required = false,
  disabled = false,
  className
}) => {
  const hypoStageApi = useApi(HypoStageApiRef);

  const { value: entityRefs, loading, error } = useAsync(
    async (): Promise<string[]> => hypoStageApi.getEntityRefs(),
    []
  );

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange(event.target.value as string);
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" style={{ marginLeft: 8 }}>
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
        value={value}
        onChange={handleChange}
        label={label}
        disabled={disabled}
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
