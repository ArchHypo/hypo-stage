import { Chip } from '@material-ui/core';
import { useStatusStyles, getStatusClass, getUncertaintyClass, getImpactClass } from '../utils/statusStyles';

interface StatusChipProps {
  value: string;
  type: 'status' | 'uncertainty' | 'impact';
  size?: 'small' | 'medium';
}

export const StatusChip: React.FC<StatusChipProps> = ({
  value,
  type,
  size = 'small'
}) => {
  const classes = useStatusStyles();

  const getClassName = () => {
    switch (type) {
      case 'status':
        return getStatusClass(value, classes);
      case 'uncertainty':
        return getUncertaintyClass(value, classes);
      case 'impact':
        return getImpactClass(value, classes);
      default:
        return classes.statusOpen;
    }
  };

  return (
    <Chip
      label={value}
      size={size}
      className={`${classes.statusChip} ${getClassName()}`}
    />
  );
};
