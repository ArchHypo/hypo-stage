import { TextField, FormControl, InputLabel, Select, MenuItem, Typography, Box } from '@material-ui/core';
import { useStyles } from '../hooks/useStyles';

interface FormFieldProps {
  error?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  error = false,
  helperText,
  children,
  className
}) => {
  const classes = useStyles();

  return (
    <Box className={className}>
      {children}
      {helperText && (
        <Typography
          variant="body2"
          color={error ? 'error' : 'textSecondary'}
          className={classes.validationMessage}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  className?: string;
  type?: string;
}

export const CustomTextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  rows = 1,
  placeholder,
  helperText,
  error = false,
  className,
  type = 'text'
}) => {
  return (
    <FormField
      error={error}
      helperText={helperText}
      className={className}
    >
      <TextField
        variant="outlined"
        fullWidth
        required={required}
        multiline={multiline}
        minRows={multiline ? rows : undefined}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        type={type}
        InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      />
    </FormField>
  );
};

interface SelectFieldProps {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CustomSelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  multiple = false,
  disabled = false,
  className
}) => {
  return (
    <FormField className={className}>
      <FormControl variant="outlined" fullWidth required={required}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value as string | string[])}
          label={label}
          multiple={multiple}
          disabled={disabled}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FormField>
  );
};
