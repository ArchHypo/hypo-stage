import {
  getHypothesisFocusTag,
  hypothesisNeedAttention,
  hypothesisCanPostpone,
} from './hypothesisFocus';

describe('hypothesisFocus', () => {
  describe('hypothesisNeedAttention', () => {
    it('returns true when uncertainty is High and impact is High', () => {
      expect(hypothesisNeedAttention({ uncertainty: 'High', impact: 'High' })).toBe(true);
    });

    it('returns true when uncertainty is Very High and impact is Very High', () => {
      expect(hypothesisNeedAttention({ uncertainty: 'Very High', impact: 'Very High' })).toBe(true);
    });

    it('returns false when uncertainty is Low', () => {
      expect(hypothesisNeedAttention({ uncertainty: 'Low', impact: 'High' })).toBe(false);
    });

    it('returns false when impact is Medium', () => {
      expect(hypothesisNeedAttention({ uncertainty: 'High', impact: 'Medium' })).toBe(false);
    });
  });

  describe('hypothesisCanPostpone', () => {
    it('returns true when impact is Very Low', () => {
      expect(hypothesisCanPostpone({ uncertainty: 'High', impact: 'Very Low' })).toBe(true);
    });

    it('returns true when impact is Low', () => {
      expect(hypothesisCanPostpone({ uncertainty: 'Medium', impact: 'Low' })).toBe(true);
    });

    it('returns false when impact is Medium or higher', () => {
      expect(hypothesisCanPostpone({ uncertainty: 'Low', impact: 'Medium' })).toBe(false);
      expect(hypothesisCanPostpone({ uncertainty: 'Low', impact: 'High' })).toBe(false);
    });
  });

  describe('getHypothesisFocusTag', () => {
    it('returns need-attention when high uncertainty and high impact (takes precedence)', () => {
      expect(getHypothesisFocusTag({ uncertainty: 'High', impact: 'High' })).toBe('need-attention');
      expect(getHypothesisFocusTag({ uncertainty: 'Very High', impact: 'Very High' })).toBe(
        'need-attention',
      );
    });

    it('returns can-postpone when impact is Very Low or Low', () => {
      expect(getHypothesisFocusTag({ uncertainty: 'Medium', impact: 'Very Low' })).toBe(
        'can-postpone',
      );
      expect(getHypothesisFocusTag({ uncertainty: 'High', impact: 'Low' })).toBe('can-postpone');
    });

    it('returns need-attention over can-postpone when both would apply (high impact + low is not possible)', () => {
      // High uncertainty + high impact only -> need-attention. Low impact -> can-postpone. They're mutually exclusive by definition.
      expect(getHypothesisFocusTag({ uncertainty: 'High', impact: 'High' })).toBe('need-attention');
    });

    it('returns null when neither need-attention nor can-postpone', () => {
      expect(getHypothesisFocusTag({ uncertainty: 'Medium', impact: 'Medium' })).toBe(null);
      expect(getHypothesisFocusTag({ uncertainty: 'Low', impact: 'High' })).toBe(null);
    });
  });
});
