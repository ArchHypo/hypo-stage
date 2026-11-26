import { agentsReadiness } from './config';
import { testConfig } from './__testUtils__/fixtures';

describe('agentsReadiness', () => {
  it('stays false when a flag is on but the model, queue, or GitHub connection is missing', () => {
    const base = testConfig();
    const config = testConfig({
      github: {},
      models: [
        ...base.models,
        { key: 'cloud', provider: 'google', modelId: 'gemini', maxInputChars: 1000, concurrency: 1 },
      ],
      providers: {},
      coach: { ...base.coach, enabled: true, model: 'cloud' },
      planner: { ...base.planner, enabled: true, model: 'cloud' },
      coverage: { ...base.coverage, enabled: true },
    });

    expect(agentsReadiness(config, false)).toEqual({
      coach: false,
      planner: false,
      pullRequests: false,
      triage: false,
      planIssues: false,
      coverage: false,
    });
  });

  it('is ready for the coach and the planner when their model can be called', () => {
    const base = testConfig();
    expect(
      agentsReadiness(
        testConfig({
          enabled: false,
          github: {},
          repositories: [],
          coach: { ...base.coach, enabled: true },
          planner: { ...base.planner, enabled: true },
        }),
        false,
      ),
    ).toEqual({
      coach: true,
      planner: true,
      pullRequests: false,
      triage: false,
      planIssues: false,
      coverage: false,
    });
  });

  it('is ready for GitHub flows only with the queue, a token, a webhook secret, and a usable model', () => {
    const base = testConfig();
    const withCoverage = testConfig({ coverage: { ...base.coverage, enabled: true } });

    expect(agentsReadiness(withCoverage, true)).toEqual({
      coach: false,
      planner: false,
      pullRequests: true,
      triage: true,
      planIssues: true,
      coverage: true,
    });
    expect(agentsReadiness(withCoverage, false)).toMatchObject({
      pullRequests: false,
      triage: false,
      planIssues: false,
      coverage: false,
    });
    expect(agentsReadiness(testConfig({ github: { apiToken: 'token' } }), true).planIssues).toBe(false);
  });
});
