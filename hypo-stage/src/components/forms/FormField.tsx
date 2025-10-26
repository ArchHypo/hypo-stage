import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@material-ui/core';
import { useStyles } from '../../hooks/useStyles';

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
  const classes = useStyles();

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
      className={classes.inputField}
    />
  );
};

interface SelectFieldProps {
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: { value: string; label: string, description?: string }[];
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
  const classes = useStyles();

  return (
    <FormControl fullWidth variant="outlined" required={required} className={classes.inputField}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as string | string[])}
        label={label}
        multiple={multiple}
        disabled={disabled}
        renderValue={(selected) => {
          if (multiple) {
            return Array.isArray(selected)
              ? selected.map(val => options.find(opt => opt.value === val)?.label).join(', ')
              : '';
          }
          return options.find(opt => opt.value === selected)?.label || '';
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <Typography variant="body1">{option.label}</Typography>
            {option.description && <Typography variant="body2" color="textSecondary">{option.description}</Typography>}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
