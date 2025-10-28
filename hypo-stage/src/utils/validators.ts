/**
 * Validate hypothesis statement
 */
export const validateHypothesisStatement = (statement: string): { isValid: boolean; message?: string } => {
  if (!statement.trim()) {
    return { isValid: false, message: 'Hypothesis statement is required' };
  }
  if (statement.trim().length < 20) {
    return { isValid: false, message: 'Please provide a more detailed hypothesis (at least 20 characters)' };
  }
  if (statement.trim().length > 500) {
    return { isValid: false, message: 'Hypothesis is too long (maximum 500 characters)' };
  }
  return { isValid: true };
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): boolean => {
  const urlPattern = /^https?:\/\/.+/;
  return urlPattern.test(url);
};

/**
 * Validate artefact URL
 */
export const isArtefactValid = (artefact: string): boolean => {
  return artefact.trim().length > 0 && artefact.trim().startsWith('http');
};

/**
 * Validate text field length
 */
export const validateTextField = (text: string, minLength: number = 1, maxLength: number = 500): { isValid: boolean; message?: string } => {
  if (!text.trim()) {
    return { isValid: false, message: 'This field is required' };
  }
  if (text.trim().length < minLength) {
    return { isValid: false, message: `Minimum ${minLength} characters required` };
  }
  if (text.trim().length > maxLength) {
    return { isValid: false, message: `Maximum ${maxLength} characters allowed` };
  }
  return { isValid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value: any): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== '' && value !== null && value !== undefined;
};
