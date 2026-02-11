import { default as React } from 'react';
import { Chip, FormControl, TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { QualityAttribute } from '@internal/plugin-hypo-stage-backend';
import { useStyles } from '../../hooks/useStyles';

/** Default helper text when none provided */
const DEFAULT_HELPER_TEXT =
  'Select one or more quality attributes. Click the field again to add another.';

export interface QualityAttributeOption {
  value: QualityAttribute;
  label: string;
  description?: string;
}

export interface QualityAttributesFieldProps {
  label: string;
  value: QualityAttribute[];
  onChange: (value: QualityAttribute[]) => void;
  options: QualityAttributeOption[];
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Multi-select field for quality attributes.
 * List closes after each selection; user clicks again to add more.
 * Selected values are shown as chips (name only); dropdown shows name + description.
 */
export const QualityAttributesField: React.FC<QualityAttributesFieldProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  helperText,
}) => {
  const classes = useStyles();
  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleChange = (
    _: React.ChangeEvent<{}>,
    newValue: QualityAttributeOption[] | null,
  ) => {
    onChange((newValue ?? []).map((opt) => opt.value));
  };

  return (
    <FormControl
      fullWidth
      required={required}
      className={classes.inputField}
      margin="normal"
    >
      <Autocomplete
        multiple
        filterSelectedOptions
        disableCloseOnSelect={false}
        value={selectedOptions}
        onChange={handleChange}
        options={options}
        getOptionLabel={(option) => option.label}
        getOptionSelected={(option: QualityAttributeOption, val: QualityAttributeOption) =>
          option.value === val.value
        }
        disabled={disabled}
        ChipProps={{ size: 'small' }}
        renderTags={(selected, getTagProps) =>
          selected.map((option, index) => (
            <Chip
              key={option.value}
              label={option.value}
              size="small"
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant="outlined"
            placeholder="Select one or more. Click to add another."
            helperText={helperText ?? DEFAULT_HELPER_TEXT}
            InputProps={params.InputProps}
          />
        )}
      />
    </FormControl>
  );
};
