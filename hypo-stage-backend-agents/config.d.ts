export interface Config {
  hypoStage?: {
    github?: {
      /**
       * Token used to read pull requests and their files.
       * @visibility secret
       */
      apiToken?: string;
      /**
       * Secret configured on the GitHub webhook (HMAC SHA-256).
       * @visibility secret
       */
      webhookSecret?: string;
      /** Login of the account behind apiToken (bot); resolved from the token when unset. */
      botLogin?: string;
    };
    agents?: {
      /** Enables PR analysis. Defaults to false. */
      enabled?: boolean;
      /** Model key used by repositories that do not set one. */
      defaultModel?: string;
      /** Minimum confidence (0..1) for a suggestion to be stored. Defaults to 0.7. */
      confidenceThreshold?: number;
      /** Max hypotheses assessed per PR after triage. Defaults to 5. */
      maxCandidates?: number;
      providers?: {
        anthropic?: {
          /** @visibility secret */
          apiKey?: string;
          baseUrl?: string;
        };
        openai?: {
          /** @visibility secret */
          apiKey?: string;
          baseUrl?: string;
        };
        google?: {
          /** @visibility secret */
          apiKey?: string;
          baseUrl?: string;
        };
        ollama?: {
          /** OpenAI-compatible endpoint, e.g. http://localhost:11434/v1 */
          baseUrl?: string;
          /** @visibility secret */
          apiKey?: string;
        };
      };
      models?: Array<{
        /** Name referenced by repositories and defaultModel. */
        key: string;
        provider: 'anthropic' | 'openai' | 'google' | 'ollama';
        /** Provider model id, e.g. claude-sonnet-5, gemini-2.5-flash-lite, qwen2.5:7b */
        modelId: string;
        /** Character budget for PR content in prompts. */
        maxInputChars?: number;
        /** Max parallel assessment calls. */
        concurrency?: number;
      }>;
      /** Hypothesis coach: reviews hypothesis statements (no GitHub needed). */
      coach?: {
        /** Defaults to false. */
        enabled?: boolean;
        /** Model key; falls back to defaultModel. */
        model?: string;
        /** Frontend reviews unreviewed statements before saving. Defaults to true. */
        checkOnSave?: boolean;
        /** Background review of hypotheses created without the coach. */
        fallback?: {
          /** Defaults to false. */
          enabled?: boolean;
          /** Defaults to 10. */
          frequencyMinutes?: number;
          /** Hypotheses reviewed per run. Defaults to 5. */
          maxPerRun?: number;
          /** Only hypotheses created in the last N days. Defaults to 7. */
          sinceDays?: number;
        };
      };
      /** Technical plan designer: proposes plan actions for a hypothesis (no GitHub needed). */
      planner?: {
        /** Defaults to false. */
        enabled?: boolean;
        /** Model key; falls back to defaultModel. */
        model?: string;
        /** Iteration length in days, used for target dates. Defaults to 14. */
        iterationDays?: number;
        /** Max actions per proposal. Defaults to 4. */
        maxActions?: number;
      };
      /** GitHub issue flows. */
      issues?: {
        /** Wait before analyzing an issue so bursts of edits/comments coalesce. Defaults to 120. */
        debounceSeconds?: number;
        /** Related human issues with the same evidence type before an evidence alert. Defaults to 3. */
        alertThreshold?: number;
      };
      /** Uncovered-uncertainty detection over unrelated issues. */
      coverage?: {
        /** Defaults to false. */
        enabled?: boolean;
        /** Defaults to 24. */
        frequencyHours?: number;
        /** Defaults to 30. */
        windowDays?: number;
        /** Minimum issues in a group. Defaults to 3. */
        minIssues?: number;
        /** Minimum median days open (impact proxy). Defaults to 2. */
        minOpenDays?: number;
      };
      repositories?: Array<{
        /** GitHub full name, owner/repo. */
        repository: string;
        /** Model key; falls back to defaultModel. */
        model?: string;
        confidenceThreshold?: number;
        issues?: {
          /** Analyze human issues against hypotheses. Defaults to false. */
          triage?: boolean;
          /** Allow opening technical plannings as issues here (token needs issues: write). Defaults to false. */
          planIssues?: boolean;
          /** Only triage issues with one of these labels (empty = all). */
          labels?: string[];
          /** Never triage issues with these labels. Defaults to question, duplicate, invalid. */
          ignoreLabels?: string[];
        };
      }>;
    };
  };
}
