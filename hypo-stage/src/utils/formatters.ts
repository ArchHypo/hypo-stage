import { LikertScale } from '@internal/plugin-hypo-stage-backend';

/**
 * Format date to a readable string
 */
export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date for display in tables
 */
export const formatDateShort = (date: Date | string): string => {
  return new Date(date).toLocaleDateString();
};

/**
 * Convert LikertScale string to number
 */
export const getRatingNumber = (rating: LikertScale | ''): number => {
  switch (rating) {
    case 'Very Low': return 1;
    case 'Low': return 2;
    case 'Medium': return 3;
    case 'High': return 4;
    case 'Very High': return 5;
    default: return 0;
  }
};

/**
 * Convert number to LikertScale string
 */
export const getRatingString = (rating: number): LikertScale => {
  switch (rating) {
    case 1: return 'Very Low';
    case 2: return 'Low';
    case 3: return 'Medium';
    case 4: return 'High';
    case 5: return 'Very High';
    default: return 'Medium';
  }
};

/**
 * Get rating label for display
 */
export const getRatingLabel = (ratingValue: number): string => {
  switch (ratingValue) {
    case 1: return 'Very Low';
    case 2: return 'Low';
    case 3: return 'Medium';
    case 4: return 'High';
    case 5: return 'Very High';
    default: return 'Not rated';
  }
};

/**
 * Get labels for chart values
 */
export const getValueLabel = (value: number): string => {
  switch (value) {
    case 1: return 'Very Low';
    case 2: return 'Low';
    case 3: return 'Medium';
    case 4: return 'High';
    case 5: return 'Very High';
    default: return value.toString();
  }
};
