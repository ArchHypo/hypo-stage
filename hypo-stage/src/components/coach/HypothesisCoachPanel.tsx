import { default as React } from 'react';
import { Box, Button, Chip, CircularProgress, Paper, Typography } from '@material-ui/core';
import EmojiObjects from '@material-ui/icons/EmojiObjects';
import type { HypothesisReviewInput } from '../../api/HypoStageApi';
import type { HypothesisCoach } from '../../hooks/useHypothesisCoach';

const CLASSIFICATION_LABELS: Record<string, string> = {
  hypothesis: 'a hypothesis',
  requirement: 'a requirement',
  risk: 'a risk',
  decision: 'a decision',
  other: 'not a hypothesis',
};

interface HypothesisCoachPanelProps {
  coach: HypothesisCoach;
  input: HypothesisReviewInput;
  qualityAttributes: string[];
  onStatementChange: (statement: string) => void;
  onSourceTypeChange: (sourceType: string) => void;
  onQualityAttributesChange: (qualityAttributes: string[]) => void;
}

export const HypothesisCoachPanel = ({
  coach,
  input,
  qualityAttributes,
  onStatementChange,
  onSourceTypeChange,
  onQualityAttributesChange,
}: HypothesisCoachPanelProps) => {
  const { review, loading, error } = coach;
  const tooShort = input.statement.trim().length < 20;
  const stale = review !== null && coach.isStale(input.statement);
  const newAttributes = (review?.suggestedQualityAttributes ?? []).filter(
    qa => !qualityAttributes.includes(qa),
  );

  return (
    <Box mt={1} data-testid="hypothesis-coach">
      <Box display="flex" alignItems="center" style={{ gap: 12 }}>
        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={loading ? <CircularProgress size={16} /> : <EmojiObjects />}
          disabled={tooShort || loading}
          onClick={() => coach.requestReview(input)}
        >
          {loading ? 'Reviewing...' : 'Review with AI'}
        </Button>
        {tooShort && (
          <Typography variant="caption" color="textSecondary">
            Write at least 20 characters to get a review.
          </Typography>
        )}
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>

      {review && (
        <Paper variant="outlined" style={{ marginTop: 12, padding: 16, opacity: stale ? 0.7 : 1 }}>
          {stale && (
            <Box mb={1} display="flex" alignItems="center" style={{ gap: 8 }}>
              <Typography variant="caption" color="textSecondary">
                Statement changed since this review.
              </Typography>
              <Button size="small" disabled={tooShort || loading} onClick={() => coach.requestReview(input)}>
                Review again
              </Button>
            </Box>
          )}

          <Typography variant="subtitle2" style={{ color: review.verdict === 'ok' ? '#1b5e20' : '#e65100' }}>
            {review.verdict === 'ok' ? '✓ Looks like a good hypothesis' : '⚠ This statement needs work'}
          </Typography>
          <Typography variant="body2" style={{ marginTop: 4 }}>
            This reads as {CLASSIFICATION_LABELS[review.classification] ?? review.classification}.{' '}
            {review.classificationReason}
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
            {review.falsifiable && review.refutingEvidence
              ? `Falsifiable: it would be refuted if ${review.refutingEvidence}`
              : 'Not falsifiable yet: no evidence could prove it false as written.'}
          </Typography>

          {review.issues.length > 0 && (
            <Box mt={1.5}>
              {review.issues.map((issue, i) => (
                <Box key={i} mb={1}>
                  <Typography variant="body2">
                    {issue.severity === 'warning' ? '⚠' : 'ℹ'} {issue.message}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ArchHypo: {issue.concept}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {review.rewrites.length > 0 && (
            <Box mt={1.5}>
              <Typography variant="subtitle2">Suggested rewrites</Typography>
              {review.rewrites.map((rewrite, i) => (
                <Box key={i} mt={1} display="flex" alignItems="flex-start" style={{ gap: 8 }}>
                  <Box flex={1}>
                    <Typography variant="body2">{rewrite.statement}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {rewrite.reason}
                    </Typography>
                  </Box>
                  <Button size="small" variant="contained" color="primary" onClick={() => onStatementChange(rewrite.statement)}>
                    Use this
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          {review.splitInto.length > 0 && (
            <Box mt={1.5}>
              <Typography variant="subtitle2">Split into separate hypotheses</Typography>
              <Typography variant="caption" color="textSecondary">
                Each uncertainty is easier to plan and track on its own. Use one here and create the others separately.
              </Typography>
              {review.splitInto.map((part, i) => (
                <Box key={i} mt={1} display="flex" alignItems="flex-start" style={{ gap: 8 }}>
                  <Typography variant="body2" style={{ flex: 1 }}>
                    {part}
                  </Typography>
                  <Button size="small" onClick={() => onStatementChange(part)}>
                    Use
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          {(review.suggestedSourceType || newAttributes.length > 0) && (
            <Box mt={1.5} display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 8 }}>
              {review.suggestedSourceType && review.suggestedSourceType !== input.sourceType && (
                <>
                  <Typography variant="body2">Source type: {review.suggestedSourceType}</Typography>
                  <Button size="small" onClick={() => onSourceTypeChange(review.suggestedSourceType!)}>
                    Apply
                  </Button>
                </>
              )}
              {newAttributes.map(qa => (
                <Chip
                  key={qa}
                  size="small"
                  label={`Add ${qa}`}
                  onClick={() => onQualityAttributesChange([...qualityAttributes, qa])}
                />
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
