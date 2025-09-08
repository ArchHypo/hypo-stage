import {
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box
} from '@material-ui/core';
import Add from '@material-ui/icons/Add';
import Delete from '@material-ui/icons/Delete';
import { isArtefactValid } from '../../utils/validators';
import { useState } from 'react';
import { useStyles } from '../../hooks/useStyles';

interface UrlListFieldProps {
  label: string;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  placeholder?: string;
  helperText?: string;
}

export const UrlListField: React.FC<UrlListFieldProps> = ({
  label,
  urls,
  onUrlsChange,
  placeholder = 'https://example.com/document',
  helperText
}) => {
  const classes = useStyles();
  const [newUrl, setNewUrl] = useState('');

  const handleAddUrl = () => {
    if (newUrl.trim() && !urls.includes(newUrl.trim())) {
      onUrlsChange([...urls, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemoveUrl = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" className={classes.subtitle}>
        {label}
      </Typography>

      <TextField
        variant="outlined"
        fullWidth
        placeholder={placeholder}
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        onKeyDown={handleKeyPress}
        InputProps={{
          endAdornment: (
            <Button
              variant="outlined"
              onClick={handleAddUrl}
              disabled={!isArtefactValid(newUrl)}
              size="small"
              className={classes.iconButton}
            >
              <Add />
              Add
            </Button>
          )
        }}
      />

      {urls.length > 0 && (
        <List dense className={classes.denseList}>
          {urls.map((url, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleRemoveUrl(index)}
                  size="small"
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {urls.length === 0 && helperText && (
        <Typography variant="body2" color="textSecondary" className={classes.secondaryText}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};
