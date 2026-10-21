# HypoStage AI agents — User guide

This guide is for teams that run HypoStage and want the AI agents of the `@archhypo/plugin-hypo-stage-backend-agents` module to help them manage architectural hypotheses with ArchHypo. It explains every feature, what to set up for it, how to try it, and what results to expect.

Looking for how the module works internally or how to extend it? See the [developer guide](./developer-guide.md).

## Contents

- [How the agents work](#how-the-agents-work)
- [Getting started](#getting-started)
- [Features](#features)
  - [PR analysis](#pr-analysis)
  - [Hypothesis coach](#hypothesis-coach)
  - [Technical plan designer](#technical-plan-designer)
  - [Issue triage](#issue-triage)
  - [Plans as issues](#plans-as-issues)
  - [Coverage: uncovered themes](#coverage-uncovered-themes)
  - [Issues report](#issues-report)
  - [Agent runs tab](#agent-runs-tab)
- [Configuration reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Data, privacy and credentials](#data-privacy-and-credentials)

---

## How the agents work

- **Agents suggest, people decide.** Every agent output is a *suggestion* shown on the hypothesis page (or in a dialog). Nothing in your hypotheses changes until someone accepts it.
- **Accepting applies the change through the normal HypoStage API**, exactly as if you edited the hypothesis or technical planning yourself. The change is validated and appears in the hypothesis history and evolution chart.
- **Uncertainty and impact stay with the team.** Agents may propose a reassessment backed by evidence (for example a merged load test), but they never change levels on their own, and the coach and plan designer never assess them at all.
- **Every agent run is traceable** in the [Agent runs tab](#agent-runs-tab): what the model was shown, what it proposed, and why each proposal was kept or dropped.

### Suggestion lifecycle

| Status | Meaning |
|---|---|
| **Pending** | Waiting for review in the **Agent Suggestions** card of the hypothesis page. |
| **Accepted** | Applied through the HypoStage API (or, for evidence alerts, just acknowledged). |
| **Rejected** | Dismissed by a reviewer; nothing changes. |
| **Superseded** | Replaced automatically, e.g. a PR got new commits, was closed without merging, or a plan issue was reopened. |

When two artifacts report the same thing (for example a PR with `Fixes #12` and the plan issue #12 being closed), you get **one** suggestion listing both under *Sources*.

---

## Getting started

### Requirements

| Requirement | Needed for |
|---|---|
| Node.js 20 | Everything |
| **PostgreSQL** database for the HypoStage plugin | PR analysis and all GitHub issue flows (they run on a [pg-boss](https://github.com/timgit/pg-boss) job queue). The coach and the plan designer also work on SQLite. |
| An LLM provider (Anthropic, OpenAI, Google or a local Ollama) | Every agent feature |
| A GitHub token and webhook | PR analysis and issue flows only |

### 1. Install the module

In a Backstage app, add the module next to the HypoStage backend plugin (`packages/backend/src/index.ts`):

```ts
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.add(import('@archhypo/plugin-hypo-stage-backend-agents'));
```

In this repository's standalone setup, `hypo-stage-backend/dev/index.ts` already loads it. Database tables are created automatically on startup.

### 2. Configure models

Models are declared once and referenced by a **key** everywhere else:

```yaml
hypoStage:
  agents:
    defaultModel: gemini-flash
    providers:
      anthropic: { apiKey: ${ANTHROPIC_API_KEY} }
      openai:    { apiKey: ${OPENAI_API_KEY} }
      google:    { apiKey: ${GOOGLE_API_KEY} }
      ollama:    { baseUrl: http://localhost:11434/v1 }   # no key needed
    models:
      - { key: claude,       provider: anthropic, modelId: claude-sonnet-5 }
      - { key: gpt,          provider: openai,    modelId: gpt-5-mini }
      - { key: gemini-flash, provider: google,    modelId: gemini-3.5-flash }
      - { key: local,        provider: ollama,    modelId: qwen2.5:7b, maxInputChars: 12000 }
```

- `maxInputChars` limits how much PR content goes into a prompt (default 60 000; 12 000 for Ollama).
- `concurrency` limits parallel calls per run (default 3; 1 for Ollama).

**Choosing a model.** A capable cloud model (Claude, GPT, Gemini Flash) gives the best results for every feature. Small local models (≤ 1B parameters) work for the coach but often miss or invent hypothesis ids in PR and issue analysis; prefer 7B+ local models if you must stay local.

### 3. Connect GitHub (PR and issue flows only)

1. **Token** (`hypoStage.github.apiToken`):
   - *Pull requests: read* — PR analysis
   - *Issues: read* — issue triage
   - *Issues: read and write* — plans as issues (creating and closing plan issues)
2. **Webhook** on each repository (or organisation):
   - Payload URL: `https://<your-backstage-backend>/api/hypo-stage/webhooks/github`
   - Content type: `application/json`
   - Secret: the same value as `hypoStage.github.webhookSecret`
   - Events: **Pull requests**, **Issues**, **Issue comments**
   - Local testing: forward deliveries with `gh webhook forward` or [smee.io](https://smee.io).
3. **Repositories** — only repositories listed here are analyzed:

```yaml
hypoStage:
  github:
    apiToken: ${GITHUB_TOKEN}
    webhookSecret: ${GITHUB_WEBHOOK_SECRET}
  agents:
    enabled: true            # PR analysis
    repositories:
      - repository: my-org/payments
        model: gemini-flash
        issues:
          triage: true       # issue triage
          planIssues: true   # plans as issues
```

4. **Bot account (optional).** If the token belongs to a dedicated bot account, set `hypoStage.github.botLogin` to its login so its own events are ignored. **Leave it unset with a personal token** — otherwise your own issues would be ignored.

### 4. Link repositories to catalog components (recommended)

Annotate the components in their `catalog-info.yaml`:

```yaml
metadata:
  annotations:
    github.com/project-slug: my-org/payments
```

Hypotheses whose entity references include such a component are the only ones considered for that repository. Without the annotation, every open hypothesis is considered (traces show `scope: all-open`), which is noisier.

### 5. Check the setup

```
GET /api/hypo-stage/agents/health
```

returns which features are on (`enabled` for PR analysis, `coach`, `planner`, `issues`, `coverage`). The UI shows agent controls only for enabled features. Configuration is read at startup: **restart the backend after changing it**.

---

## Features

Each feature lists what it does, how to set it up, how to try it, the possible outcomes, and what to check when nothing happens.

### PR analysis

**What it does.** When a pull request is opened, updated, reopened, marked ready for review or merged in a configured repository, the agent:

1. collects the PR description and diff (lockfiles, binaries and generated files are skipped);
2. **triages** which open hypotheses the PR may affect;
3. **assesses** each candidate hypothesis together with its technical plannings and recent history;
4. passes the proposals through deterministic **checks** (valid ids, confidence threshold, allowed changes);
5. stores the surviving suggestions.

**Set up.** `hypoStage.agents.enabled: true`, the repository in `repositories`, the token and the **Pull requests** webhook event. Optional: `confidenceThreshold` (default 0.7, per repository or global) and `maxCandidates` (default 5 hypotheses per PR).

**Try it.**
1. Create a hypothesis with a technical planning, e.g. *"It is possible to process checkout requests at 1000 requests per second using a single application server."* (uncertainty High, impact High) with a Spike planning *"Load test checkout on one node"*.
2. Open a PR in the configured repository that adds a load-test script, with a description such as *"Adds a k6 load test driving checkout at 1000 rps on a single server (thresholds: p95 < 200 ms)."*
3. After a few seconds, open the hypothesis page: the **Agent Suggestions** card shows the suggestions grouped under the PR.
4. Merge the PR after adding results (e.g. *"Result: 1000 rps sustained, p95 182 ms"*) to see completion and reassessment proposals.

**Possible outcomes.**

| Suggestion | Appears when | Accepting it… |
|---|---|---|
| Related artefact | The PR is related to the hypothesis | adds the PR URL to the hypothesis's related artefacts |
| Planning progress — *advances* | The PR works on one of the hypothesis's plannings | adds the PR URL to the planning documentation (and may update its expected outcome) |
| Planning progress — *completes* | The **merged** PR fully carries out the planning | records it as done; if the planning has an open plan issue, that issue is closed |
| Reassessment | The PR brings evidence that changes uncertainty or impact | updates the levels through the technical planning, shown on the evolution chart |
| New technical planning | The PR reveals work no planning covers | creates the planning |
| Status change | The **merged** PR removes the uncertainty or fires a trigger | changes the hypothesis status (e.g. Validated) |

Pushing new commits replaces the PR's pending suggestions; closing it without merging withdraws them. Draft PRs are ignored.

**When nothing happens.**
- Webhook delivery shows `401` → the secret differs; `202 repository not configured` → add the repository; `503` → the database is not PostgreSQL.
- The run exists but has no suggestions → open it in the [Agent runs tab](#agent-runs-tab). `candidates=0` means triage found no related hypothesis; dropped reasons show why proposals were filtered (e.g. confidence below threshold, *"completes" requires a merged PR*).
- A merged load-test **script** without results is correctly read as *advances*, not *completes*: uncertainty only drops when evidence arrives.

### Hypothesis coach

**What it does.** Reviews a hypothesis statement and explains, in ArchHypo terms, whether it is a real hypothesis or actually a requirement, risk or decision; whether it is falsifiable (what evidence would refute it); and what to improve. It proposes rewrites, splits for statements that mix several uncertainties, a source type and quality attributes. It never sets uncertainty or impact.

It works in three modes:

| Mode | When | Result |
|---|---|---|
| On demand | **Review with AI** under the statement in the create and edit forms | A review panel; **Use this** copies a rewrite into the field, chips add quality attributes |
| At save (`checkOnSave`) | Saving a statement that has no review yet | If it needs work, a dialog offers **Back to edit** or **Save anyway** — it never blocks saving |
| Fallback (`fallback.enabled`) | Every few minutes, for recent hypotheses that never went through the coach (e.g. created through the API) | A **Statement rewrite** suggestion in the Agent Suggestions card, only when the statement needs work |

**Set up.**

```yaml
hypoStage:
  agents:
    coach:
      enabled: true
      model: gemini-flash        # optional, defaults to defaultModel
      checkOnSave: true
      fallback: { enabled: true, frequencyMinutes: 10, maxPerRun: 5, sinceDays: 7 }
```

No GitHub setup is needed.

**Try it.**
- Type *"The system must process 1000 requests per second"* and click **Review with AI** → classified as a **requirement**, with a falsifiable rewrite.
- Review *"We will use Kafka for notifications"* → classified as a **decision**.
- Review *"The new gateway will be fast, secure and cheaper to run than the old one"* → **too broad**, with split suggestions.
- Click **Create** with an unreviewed weak statement → the confirmation dialog appears.

**Possible outcomes.** A verdict (*looks like a good hypothesis* or *needs work*), the classification and its reason, falsifiability, issues with the ArchHypo concept behind each one, up to two rewrites, splits, and suggested source type and quality attributes. Editing the statement after a review marks the review as outdated.

**When nothing happens.**
- No **Review with AI** button → `coach.enabled` is false, or the backend was not restarted.
- *"Too many coach reviews"* → the limit is 20 reviews per user every 10 minutes.
- A timeout (about 20 seconds) shows an error but never blocks saving.
- The fallback suggests nothing for a hypothesis whose statement is already good — rewrites are only proposed when the verdict is *needs work*.

### Technical plan designer

**What it does.** Proposes 2–4 technical plan actions for a hypothesis from the ArchHypo catalogue (Experiment, Analytics, Spike, Tracer Bullet, Modularization, Trigger, Guideline). The strategy is chosen from the hypothesis's uncertainty and impact before the model is asked:

| Uncertainty / Impact | Strategy |
|---|---|
| high / high | Act in the first iteration: accept/refute or reduce uncertainty now, optionally reduce impact in parallel |
| high / medium | Investigate early, plus a trigger that says when to decide |
| high or medium / low | Postpone with criteria (architectural trigger, landing zone) |
| low / high | Reduce the impact (modularization, anti-corruption layer) or settle it with a tracer bullet |
| low / low–medium | Monitor with a guideline or trigger |
| medium / medium–high | Balance uncertainty and impact reduction |

Each action's expected outcome states its goal and the evidence to look for, for example:

```
Goal: Reduce uncertainty. Evidence: one node sustains 1000 rps at p95 < 200 ms. Expected effect: uncertainty High → Low.
```

The PR and issue agents later use this evidence to recognise when work carries out the planning.

**Set up.** `hypoStage.agents.planner.enabled: true` (optional `model`, `iterationDays` — default 14, used to compute target dates — and `maxActions`, default 4). The hypothesis needs at least one entity reference.

**Try it.** On a hypothesis page, open the **Technical Planning** card and click **Suggest plan with AI**. Try hypotheses with different levels (High/High, High/Low, Low/High) and compare the strategies.

**Possible outcomes.** A strategy chip, a short reading of the assessment, warnings (e.g. no action reduces uncertainty in the first iteration although the strategy asks for it), and action cards with type, goal, iteration and target date, component, expected outcome and rationale. Per action: **Add** (creates the planning), **Edit before adding** (opens the pre-filled form) or **Dismiss**. **Generate again** asks for a new proposal; existing plannings are never proposed again.

**When nothing happens.** *"Add at least one entity reference"* → edit the hypothesis first. Requests are limited to 10 per user every 10 minutes and time out after about 45 seconds.

### Issue triage

**What it does.** Reads human-reported GitHub issues the way the ArchHypo authors analysed support reports after a release: it classifies each issue (bug, improvement, question, other) and its quality attributes, and checks whether it is evidence about a hypothesis. A reported issue is a claim, not verified evidence, so the agent **never reassesses** a hypothesis from issues.

**Set up.** `repositories[].issues.triage: true`, the **Issues** and **Issue comments** webhook events, and a token that can read issues. Optional per repository: `labels` (only triage issues with one of these labels; empty = all) and `ignoreLabels` (default `question`, `duplicate`, `invalid`). Globally: `issues.debounceSeconds` (default 120 — edits and comments within this window are analyzed once) and `issues.alertThreshold` (default 3).

**Try it.**
1. Open an issue such as *"Checkout times out with ~600 concurrent requests per second on the single app server"* in a configured repository.
2. Wait for the debounce, then check the Agent runs tab (flow *Issue triage*) and the hypothesis's suggestions.
3. To see a fired trigger, first add a **Trigger** planning to the hypothesis (e.g. *"Revisit the architecture when checkout exceeds 700 concurrent users"*), then report an issue that meets that condition.
4. To see an evidence alert, report three issues that contradict the same hypothesis.

**Possible outcomes.**

| Suggestion | Appears when | Accepting it… |
|---|---|---|
| Related artefact | The issue is related to a hypothesis | adds the issue URL to the related artefacts |
| Status change → **Trigger-Fired** | The issue meets the condition of one of the hypothesis's Trigger plannings | changes the status; a **Suggest plan with AI** shortcut helps plan the next actions |
| **Evidence alert** | `alertThreshold` issues support or contradict the same hypothesis | **Acknowledge** only records that the team saw it; reconsider the assessment at your next review. Only issues reported after an acknowledgement count toward the next alert |

Unrelated issues produce no suggestion but are still recorded for [Coverage](#coverage-uncovered-themes) and the [Issues report](#issues-report).

**When nothing happens.** The webhook reply explains ignored events: *issue triage not enabled for this repository*, *issue has an ignored label*, *issue has none of the triage labels*, *edit did not change title or body*. Comments on pull requests are not issue events.

### Plans as issues

**What it does.** Brings technical plans into the team's backlog and keeps both sides in sync:

| Action | Result |
|---|---|
| **Open as issue** on a technical planning | Creates a labelled issue (`archhypo:plan`, the action type, the hypothesis) with the plan's description, expected outcome and target date; the issue URL is added to the planning's documentation; a badge shows `#N · open` |
| Closing the issue as *completed* | Proposes the planning as completed (no model involved) |
| Closing it as *not planned* | Only updates the badge |
| Reopening it | Withdraws a pending completion; after a reopen, the planning can be completed again |
| A human comment with results | Assessed against the planning's `Goal:`/`Evidence:` only — it can propose progress or a reassessment for that planning, never links or new plannings |
| A PR with `Fixes #N` / `Closes #N` / `Resolves #N` | Matched to the planning directly (*advances* while open, *completes* when merged); merges with the issue-closed suggestion into one |
| **Accepting** a *completes* suggestion | Records the planning as done and **closes the open plan issue** with a "Completed in HypoStage." comment |

A completed planning is never proposed as completed again unless its plan issue is reopened.

**Set up.** `repositories[].issues.planIssues: true` and a token with **Issues: read and write**. The issue is opened in the repository annotated on the planning's component (`github.com/project-slug`); otherwise a dialog asks you to choose among repositories that allow plan issues.

**Try it.**
1. On a planning, click **Open as issue** and open the created issue on GitHub.
2. Comment *"Ran the load test: 1400 rps at p95 140 ms"* → a progress or reassessment suggestion for that planning.
3. Merge a PR whose body contains `Fixes #<issue>` into the default branch → one *completes* suggestion with both sources.
4. Accept it → the issue is closed (if still open); closing it again proposes nothing new.

**When nothing happens.** *"GitHub refused to create the issue"* → the token lacks *Issues: write*. `Fixes #N` only matches when the PR body uses one of GitHub's closing keywords (`fixes`, `closes`, `resolves`) followed by `#N` from the same repository; GitHub itself only auto-closes issues for PRs merged into the default branch.

### Coverage: uncovered themes

**What it does.** Looks for **uncertainties nobody elicited**: recurring, costly problems that no hypothesis covers. A scheduled job groups recent issues that triage found unrelated to every hypothesis by component and quality attribute. A group qualifies when it has at least `minIssues` issues and shows a sign of cost:

- median time open ≥ `minOpenDays`, **or**
- at least one reopened issue, **or**
- three or more comments per issue on average.

Quick fixes are skipped: issues resolved quickly are low impact and outside ArchHypo's scope. For each qualifying group, the model names the theme and drafts a hypothesis, which the coach reviews (if enabled).

**Set up.**

```yaml
hypoStage:
  agents:
    coverage: { enabled: true, frequencyHours: 24, windowDays: 30, minIssues: 3, minOpenDays: 2 }
```

Requires issue triage (it works on triaged issues). The job first runs about two minutes after startup.

**Try it.** Report three unrelated performance issues on the same repository (e.g. slow image uploads, slow avatar thumbnails, timeouts on large albums), close one as fixed and **reopen** it, then wait for the job (or restart the backend). For the opposite case, report three issues and close them within an hour with no comments: no theme appears.

**Possible outcomes.** An entry under **Uncovered themes** in the [Issues report](#issues-report) with the theme, the issues, the impact signals and a draft hypothesis. **Create hypothesis** opens the create form pre-filled with the draft, component, quality attribute and the issue links; **Dismiss** hides it until new issues join the group.

### Issues report

**What it does.** A maintenance report of the selected period:

- **Reported issues** — total, by type and quality attribute, how many relate to hypotheses (and with which evidence), resolution time (median days, % closed within a day).
- **Technical plan activities** carried out as issues — by action type and month, completed / not planned / open.
- **Uncovered themes** from Coverage.

**Set up.** Enabled automatically when any repository has `issues.triage` or `issues.planIssues`. The **Issues report** tab appears on the HypoStage home page (`/hypo-stage?tab=issues-report`).

**Try it.** Open the tab, switch the period (24 hours, 7, 30, 90 days, 12 months) and use **Download Markdown** for a narrative export of the same data.

### Agent runs tab

**What it does.** Lists every agent run (`/hypo-stage?tab=agent-runs`) with its flow (PR analysis, Issue triage, Plan issue sync, Plan issue comment), repository, PR or issue, model, status, suggestion count and duration. Click a row to read its trace:

- **Context** — scope (`repository` or `all-open`), hypotheses in scope, and either files/merged (PRs) or issue state/comments/reopened (issues).
- **Triage** — candidates the model returned; the selected ones with relevance and reason; the **dropped** ones with the reason (unknown id, relevance below 0.4, duplicate, over `maxCandidates`).
- **Assessment** per hypothesis — what the model proposed, which suggestions were kept, and each **dropped** proposal with its reason.
- **Errors** of failed runs and **skipped** reasons.

Use it first whenever a run produced fewer suggestions than you expected.

---

## Configuration reference

All keys are under `hypoStage`. Booleans accept `true/false`, `yes/no`, `on/off` and `1/0`; anything else fails at startup. Restart the backend after changes.

| Key | Default | Description |
|---|---|---|
| `github.apiToken` | — | Token used to read PRs and issues and to create/close plan issues (secret) |
| `github.webhookSecret` | — | HMAC secret of the GitHub webhook (secret) |
| `github.botLogin` | — | Login of a dedicated bot account behind the token; its own events are ignored. Leave unset with a personal token |
| `agents.enabled` | `false` | PR analysis |
| `agents.defaultModel` | — | Model key used when a repository, the coach or the planner doesn't set one |
| `agents.confidenceThreshold` | `0.7` | Minimum confidence (0–1) for PR and issue suggestions |
| `agents.maxCandidates` | `5` | Hypotheses assessed per PR or issue after triage |
| `agents.providers.<anthropic\|openai\|google>.apiKey` | — | Provider API key (secret) |
| `agents.providers.<…>.baseUrl` | provider default | Custom endpoint |
| `agents.providers.ollama.baseUrl` | `http://localhost:11434/v1` | Ollama's OpenAI-compatible endpoint |
| `agents.models[].key` | — | Name used to reference the model |
| `agents.models[].provider` | — | `anthropic`, `openai`, `google` or `ollama` |
| `agents.models[].modelId` | — | Provider model id |
| `agents.models[].maxInputChars` | `60000` (`12000` Ollama) | Character budget for PR/issue content in prompts |
| `agents.models[].concurrency` | `3` (`1` Ollama) | Parallel assessment calls per run |
| `agents.repositories[].repository` | — | `owner/repo` |
| `agents.repositories[].model` | `defaultModel` | Model key for this repository |
| `agents.repositories[].confidenceThreshold` | global value | Per-repository threshold |
| `agents.repositories[].issues.triage` | `false` | Issue triage |
| `agents.repositories[].issues.planIssues` | `false` | Plans as issues |
| `agents.repositories[].issues.labels` | `[]` | Only triage issues with one of these labels (empty = all) |
| `agents.repositories[].issues.ignoreLabels` | `[question, duplicate, invalid]` | Never triage issues with these labels |
| `agents.issues.debounceSeconds` | `120` | Wait before analyzing an issue so bursts of edits/comments coalesce |
| `agents.issues.alertThreshold` | `3` | Related issues with the same evidence type before an evidence alert |
| `agents.coach.enabled` | `false` | Hypothesis coach |
| `agents.coach.model` | `defaultModel` | Coach model key |
| `agents.coach.checkOnSave` | `true` | Review unreviewed statements when saving |
| `agents.coach.fallback.enabled` | `false` | Background review of hypotheses created without the coach |
| `agents.coach.fallback.frequencyMinutes` | `10` | Job frequency |
| `agents.coach.fallback.maxPerRun` | `5` | Hypotheses reviewed per run |
| `agents.coach.fallback.sinceDays` | `7` | Only hypotheses created in the last N days |
| `agents.planner.enabled` | `false` | Technical plan designer |
| `agents.planner.model` | `defaultModel` | Planner model key |
| `agents.planner.iterationDays` | `14` | Iteration length used to compute target dates |
| `agents.planner.maxActions` | `4` | Maximum actions per proposal |
| `agents.coverage.enabled` | `false` | Uncovered-theme detection |
| `agents.coverage.frequencyHours` | `24` | Job frequency |
| `agents.coverage.windowDays` | `30` | Issues considered |
| `agents.coverage.minIssues` | `3` | Minimum issues per theme |
| `agents.coverage.minOpenDays` | `2` | Minimum median days open (impact signal) |

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Webhook delivery returns **401** | `webhookSecret` differs from the secret on GitHub |
| **404** on `/api/hypo-stage/agents/...` webhook URL | The webhook path is `/api/hypo-stage/webhooks/github` (no `agents`) |
| **202** *repository not configured* / *agents disabled* | Add the repository to `repositories` / set `agents.enabled` |
| **503** *require a PostgreSQL database* | Queued flows need PostgreSQL |
| Accepting a suggestion shows **Bad Request** | The hypothesis itself has values the API rejects (e.g. old demo data with an invalid source type or status). Edit the hypothesis to valid values and accept again |
| A run has no suggestions | Open it in the Agent runs tab and read the dropped reasons |
| Your own issues are ignored | `botLogin` is set to your personal account; unset it |
| Plan issues can't be created or closed | The token lacks *Issues: write* on that repository |
| No agent buttons or tabs in the UI | The feature flag is off, or the backend wasn't restarted; check `/api/hypo-stage/agents/health` |

---

## Data, privacy and credentials

- **What is sent to model providers:** PR titles, descriptions and diffs; issue titles, bodies and comments; hypothesis statements and technical plannings. For sensitive repositories, use a local Ollama model or a provider your organisation approves.
- **Who sees agent output:** any signed-in Backstage user can see suggestions, run traces and the issues report, including summaries of private repositories.
- **Credentials:** all GitHub calls use the single configured token, so issues opened from HypoStage appear as authored by that account. For production, use a dedicated bot account or a GitHub App with only the permissions listed above.
