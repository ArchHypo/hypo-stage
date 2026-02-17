import {
  formatDate,
  formatDateShort,
  getRatingNumber,
  getRatingString,
  getRatingLabel,
  getValueLabel,
} from './formatters';
import { LikertScale } from '@internal/plugin-hypo-stage-backend';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/January.*15.*2024/);
    });

    it('should handle string dates', () => {
      const formatted = formatDate('2024-01-15T10:30:00Z');
      expect(formatted).toMatch(/January.*15.*2024/);
    });
  });

  describe('formatDateShort', () => {
    it('should format date in short format', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDateShort(date);
      expect(formatted).toBeTruthy();
    });
  });

  describe('getRatingNumber', () => {
    it('should convert LikertScale to number', () => {
      expect(getRatingNumber('Very Low' as LikertScale)).toBe(1);
      expect(getRatingNumber('Low' as LikertScale)).toBe(2);
      expect(getRatingNumber('Medium' as LikertScale)).toBe(3);
      expect(getRatingNumber('High' as LikertScale)).toBe(4);
      expect(getRatingNumber('Very High' as LikertScale)).toBe(5);
      expect(getRatingNumber('' as any)).toBe(0);
    });
  });

  describe('getRatingString', () => {
    it('should convert number to LikertScale', () => {
      expect(getRatingString(1)).toBe('Very Low');
      expect(getRatingString(2)).toBe('Low');
      expect(getRatingString(3)).toBe('Medium');
      expect(getRatingString(4)).toBe('High');
      expect(getRatingString(5)).toBe('Very High');
      expect(getRatingString(0)).toBe('Medium'); // default
    });
  });

  describe('getRatingLabel', () => {
    it('should return rating label', () => {
      expect(getRatingLabel(1)).toBe('Very Low');
      expect(getRatingLabel(2)).toBe('Low');
      expect(getRatingLabel(3)).toBe('Medium');
      expect(getRatingLabel(4)).toBe('High');
      expect(getRatingLabel(5)).toBe('Very High');
      expect(getRatingLabel(0)).toBe('Not rated');
    });
  });

  describe('getValueLabel', () => {
    it('should return labels for chart values', () => {
      expect(getValueLabel(1)).toBe('Very Low');
      expect(getValueLabel(2)).toBe('Low');
      expect(getValueLabel(3)).toBe('Medium');
      expect(getValueLabel(4)).toBe('High');
      expect(getValueLabel(5)).toBe('Very High');
      expect(getValueLabel(0)).toBe('0');
    });
  });
});
