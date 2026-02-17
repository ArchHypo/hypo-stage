import { default as React } from 'react';
import { Typography, Box, Chip } from '@material-ui/core';
import Link from '@material-ui/icons/Link';
import { Link as RouterLink } from 'react-router-dom';
import { parseEntityRef } from '@backstage/catalog-model';
import { useStyles } from '../hooks/useStyles';

export interface EntityRefLinksProps {
  entityRefs: string[];
  /** When true, render compact (e.g. for table cells). Default false. */
  compact?: boolean;
  /** Optional title (e.g. "Linked components"). Omitted in compact mode. */
  title?: string;
  className?: string;
}

/**
 * Renders a list of Backstage entity references as links to the catalog.
 * Entity refs are parsed and linked to /catalog/:namespace/:kind/:name.
 */
export function EntityRefLinks({
  entityRefs,
  compact = false,
  title,
  className,
}: EntityRefLinksProps) {
  const classes = useStyles();

  const links = React.useMemo(() => {
    return entityRefs
      .map(ref => {
        try {
          const { kind, namespace, name } = parseEntityRef(ref, {
            defaultKind: 'component',
            defaultNamespace: 'default',
          });
          const href = `/catalog/${namespace}/${kind}/${name}`;
          const displayName = name;
          return { href, displayName, ref };
        } catch {
          return null;
        }
      })
      .filter((x): x is { href: string; displayName: string; ref: string } => x !== null);
  }, [entityRefs]);

  if (links.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No entity references
      </Typography>
    );
  }

  const linkContent = (
    <Box className={classes.flexWrap} style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {links.map(({ href, displayName }) => (
        <Chip
          key={href}
          component={RouterLink}
          to={href}
          label={displayName}
          size="small"
          clickable
          variant="outlined"
          style={{ textDecoration: 'none' }}
        />
      ))}
    </Box>
  );

  if (compact) {
    return <Box className={className}>{linkContent}</Box>;
  }

  return (
    <Box className={className}>
      {title && (
        <Typography
          variant="h6"
          style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Link />
          {title}
        </Typography>
      )}
      {linkContent}
    </Box>
  );
}
