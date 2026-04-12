# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-12

First **1.x** release line: suitable for **production Backstage** deployments when you align with supported Backstage and Node.js versions (see the root [README](README.md) and package peer ranges).

### Added

- **Hypothesis updates:** `statement` is editable on the edit page; `PUT /api/hypo-stage/hypotheses/:id` accepts `statement` (20–500 characters) with the same rules as create.
- **Optional evidence links:** Related-artefact URLs (hypothesis) and documentation URLs (technical planning) are optional on create and edit, with clearer UI copy and empty-state handling.
- **Repository hygiene:** `CHANGELOG.md`, `SECURITY.md`, and `CONTRIBUTING.md` for standard open-source expectations.
- **NPM package metadata:** `description`, `keywords`, `homepage`, and `bugs` on both published packages for better registry discoverability.

### Changed

- **README:** Documents current release maturity, Backstage usage, badges, and links to changelog and security policy.

### Removed

- **Playwright end-to-end tests:** Specs, config, scheduled workflow, and related tooling (high cost vs. value); CI relies on unit tests and manual verification.
- **Multi-clip walkthrough:** Replaced by a single illustrative GIF under `docs/images/` for the README hero.

### Upgrade notes (from 0.1.x)

- **API:** Clients that call `PUT .../hypotheses/:id` must send a valid **`statement`** field together with existing fields.
- **Dependencies:** Install **matching** versions of `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` (both `1.0.0` for this release).

## [0.1.2] and earlier

See [git history](https://github.com/ArchHypo/hypo-stage/commits/main) for changes prior to this changelog file.
