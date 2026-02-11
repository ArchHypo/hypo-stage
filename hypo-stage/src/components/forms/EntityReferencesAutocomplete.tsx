import { default as React, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { FormControl, TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import useDebounce from 'react-use/lib/useDebounce';
import useAsync from 'react-use/lib/useAsync';
import { useStyles } from '../../hooks/useStyles';

/** Debounce delay (ms) before triggering catalog search */
const SEARCH_DEBOUNCE_MS = 300;
/** Minimum input length to trigger search */
const MIN_SEARCH_LENGTH = 1;
/** Max entity refs returned per search */
const MAX_OPTIONS = 50;
/** Default helper text when none provided */
const DEFAULT_HELPER_TEXT =
  'Type to search for catalog components. Select one or more entity references.';

/** Props for the Entity References autocomplete field */
export interface EntityReferencesAutocompleteProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
}

/**
 * Multi-value autocomplete for catalog entity references.
 * Uses catalog search (queryEntities with fullTextFilter) so it scales to large catalogs.
 */
export const EntityReferencesAutocomplete: React.FC<EntityReferencesAutocompleteProps> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  helperText,
  error = false,
}) => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [inputValue, setInputValue] = useState('');

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useDebounce(
    () => setDebouncedSearchTerm(inputValue.trim()),
    SEARCH_DEBOUNCE_MS,
    [inputValue],
  );

  const shouldSearch = debouncedSearchTerm.length >= MIN_SEARCH_LENGTH;

  const { loading, value: searchResult } = useAsync(
    async () => {
      if (!shouldSearch) return { items: [] as string[], totalItems: 0 };
      const response = await catalogApi.queryEntities({
        filter: [{ kind: 'component' }],
        fullTextFilter: { term: debouncedSearchTerm },
        limit: MAX_OPTIONS,
        orderFields: [{ field: 'metadata.name', order: 'asc' }],
      });
      const entityRefs = (response.items ?? []).map(entity =>
        stringifyEntityRef(entity),
      );
      return { items: entityRefs, totalItems: response.totalItems ?? 0 };
    },
    [debouncedSearchTerm, shouldSearch, catalogApi],
  );

  const options = searchResult?.items ?? [];

  const handleChange = (
    _: React.ChangeEvent<{}>,
    newValue: string[] | null,
  ) => {
    onChange(newValue ?? []);
  };

  return (
    <FormControl
      fullWidth
      required={required}
      error={error}
      className={classes.inputField}
      margin="normal"
    >
      <Autocomplete
        multiple
        filterSelectedOptions
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        options={options}
        loading={loading}
        disabled={disabled}
        ChipProps={{ size: 'small' }}
        getOptionLabel={option => option}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            variant="outlined"
            placeholder="Search components..."
            helperText={helperText ?? DEFAULT_HELPER_TEXT}
            error={error}
            InputProps={params.InputProps}
          />
        )}
      />
    </FormControl>
  );
};
