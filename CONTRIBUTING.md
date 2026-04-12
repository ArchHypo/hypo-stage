# Contributing to HypoStage

Thank you for helping improve HypoStage.

## Getting started

1. **Fork** the repository and create a branch from `main`.
2. **Install:** From the repo root, `yarn install --ignore-engines` (Node.js 20+ recommended).
3. **Validate:** Run `make check` (or `yarn build`, `CI=true yarn test`, `yarn lint`) before opening a PR.

## Guidelines

- Keep changes **focused** on a single concern when possible; follow existing code style and patterns.
- **Tests:** Add or update tests for behaviour changes (frontend and/or backend workspaces).
- **Documentation:** Update the root `README.md` or `docs/` when user-facing behaviour or setup changes.

## Pull requests

- Open a PR against `main` with a clear description of **what** changed and **why**.
- Link related issues when applicable.
- Ensure CI is green (build, unit tests, lint).

## Code of conduct

Participate respectfully. Disagreement is fine; harassment is not.

For security-sensitive issues, see [SECURITY.md](SECURITY.md) instead of filing a public issue.
