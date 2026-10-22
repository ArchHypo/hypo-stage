import { band, strategyProfile } from './strategy';

describe('strategyProfile', () => {
  it.each([
    ['Very High', 'High', 'act_now'],
    ['High', 'Very High', 'act_now'],
    ['High', 'Medium', 'investigate'],
    ['Very High', 'Low', 'postpone_with_criteria'],
    ['Medium', 'Very Low', 'postpone_with_criteria'],
    ['Low', 'High', 'reduce_impact'],
    ['Very Low', 'Very High', 'reduce_impact'],
    ['Low', 'Low', 'monitor'],
    ['Very Low', 'Medium', 'monitor'],
    ['Medium', 'Medium', 'balanced'],
    ['Medium', 'High', 'balanced'],
  ])('uncertainty %s / impact %s → %s', (u, i, profile) => {
    expect(strategyProfile(u, i).profile).toBe(profile);
  });

  it('requires an uncertainty action in iteration 1 for act_now', () => {
    expect(strategyProfile('High', 'High')).toMatchObject({
      requiredGoals: ['accept_or_refute', 'reduce_uncertainty'],
      requiredBy: 1,
    });
  });

  it('bands levels', () => {
    expect(['Very Low', 'Low', 'Medium', 'High', 'Very High'].map(band)).toEqual([
      'low', 'low', 'medium', 'high', 'high',
    ]);
  });
});
