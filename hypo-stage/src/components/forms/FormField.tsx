import { TextField, FormControl, InputLabel, Select, MenuItem } from '@material-ui/core';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  type?: string;
}

export const CustomTextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  rows = 1,
  placeholder,
  helperText,
  error = false,
  type = 'text'
}) => {
  return (
    <TextField
    fullWidth
      variant="outlined"
      required={required}
      disabled={disabled}
      multiline={rows > 1}
      minRows={rows > 1 ? rows : undefined}
      label={label}
      placeholder={placeholder}
      helperText={helperText}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      type={type}
      InputLabelProps={type === 'date' ? { shrink: true } : undefined}
    />
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
}

export const CustomSelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  multiple = false,
  disabled = false
}) => {
  return (
    <FormControl fullWidth variant="outlined" required={required}>
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
  );
};
