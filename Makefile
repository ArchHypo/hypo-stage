# HypoStage plugin – Makefile for build, test, lint and Docker dependencies.
# Use Node.js 22.x (e.g. nvm use 22).

SHELL := /usr/bin/env bash -o pipefail
.SHELLFLAGS := -ec

.PHONY: all
all: help

##@ General

.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Dependencies

.PHONY: deps
deps: ## Install dependencies (yarn install --ignore-engines)
	yarn install --ignore-engines

##@ Build

.PHONY: build
build: ## Build frontend, backend, and the agents module (declarations + Backstage CLI build)
	yarn build

##@ Tests

.PHONY: test
test: ## Run unit tests for every workspace, non-interactive
	CI=true yarn test

##@ Lint

.PHONY: lint
lint: ## Run lint on every workspace and root scripts
	yarn lint

##@ Run all

.PHONY: check
check: ## Build, test, and lint in one go (non-interactive)
	@set +e; \
	tmpdir=$$(mktemp -d); build_log="$$tmpdir/build.log"; test_log="$$tmpdir/test.log"; lint_log="$$tmpdir/lint.log"; failed=0; \
	echo ""; echo "=== Build ==="; \
	start=$$(date +%s); $(MAKE) build 2>&1 | tee "$$build_log"; build_ret=$$?; end=$$(date +%s); build_duration=$$((end-start)); \
	if [ $$build_ret -eq 0 ]; then echo "Build: OK ($${build_duration}s)"; else echo "Build: FAILED"; failed=1; fi; \
	echo ""; echo "=== Test ==="; \
	$(MAKE) test 2>&1 | tee "$$test_log"; test_ret=$$?; \
	if [ $$test_ret -eq 0 ]; then \
	  test_report=$$(grep -E "Test Suites:|Tests:[[:space:]]+[0-9]+" "$$test_log" | sed 's/^[[:space:]]*/    /'); \
	  echo "Test: OK"; printf '%s\n' "$$test_report"; \
	else echo "Test: FAILED"; failed=1; fi; \
	echo ""; echo "=== Lint ==="; \
	$(MAKE) lint 2>&1 | tee "$$lint_log"; lint_ret=$$?; \
	lint_line=""; \
	if [ $$lint_ret -eq 0 ]; then \
	  lint_line=$$(grep -E "([0-9]+ problem|No problem|✔|✖)" "$$lint_log" | tail -1 | sed 's/^[[:space:]]*//'); \
	  if [ -n "$$lint_line" ]; then echo "Lint: OK ($$lint_line)"; else echo "Lint: OK"; fi; \
	else echo "Lint: FAILED"; failed=1; fi; \
	echo ""; echo "--- Check summary ---"; \
	echo "  Build:  $$([ $$build_ret -eq 0 ] && echo "passed ($${build_duration}s)" || echo "FAILED")"; \
	if [ $$test_ret -eq 0 ]; then echo "  Test:   passed"; printf '%s\n' "$$test_report" | sed 's/^/  /'; else echo "  Test:   FAILED"; fi; \
	if [ $$lint_ret -eq 0 ]; then echo "  Lint:   passed$$([ -n "$$lint_line" ] && echo " ($$lint_line)" || true)"; else echo "  Lint:   FAILED"; fi; \
	echo ""; \
	if [ $$failed -eq 0 ]; then echo "All steps passed."; else echo "One or more steps failed."; fi; \
	rm -rf "$$tmpdir"; [ $$failed -eq 0 ] || exit 1

##@ Docker (generic Backstage)

.PHONY: start-dependencies
start-dependencies: ## Start Docker dependencies (PostgreSQL for HypoStage backend)
	docker-compose up -d

.PHONY: reset-agents-db
reset-agents-db: ## Drop HypoStage agents tables and migration history (re-created on next backend start)
	@docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c 'DROP TABLE IF EXISTS agent_plan_proposal_actions, agent_plan_proposals, agent_suggestions, agent_hypothesis_reviews, agent_issue_links, agent_issue_observations, agent_coverage_findings, agent_runs CASCADE; DROP TABLE IF EXISTS knex_migrations_hypo_stage_agents, knex_migrations_hypo_stage_agents_lock; DROP SCHEMA IF EXISTS pgboss CASCADE;'

.PHONY: create-db
create-db: ## Create the HypoStage plugin database in hypo-stage-postgres (backstage_plugin_hypo_stage)
	@docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c 'SELECT 1' >/dev/null 2>&1 && \
	(echo "Plugin database 'backstage_plugin_hypo_stage' already exists in container." && exit 0) || \
	(docker exec hypo-stage-postgres psql -U postgres -c 'CREATE DATABASE backstage_plugin_hypo_stage;' && echo "Plugin database 'backstage_plugin_hypo_stage' created.") || \
	(echo "Run 'make start-dependencies' first if Postgres is not running." && exit 1)

.PHONY: seed-standalone
seed-standalone: ## Create plugin DB (if using Docker) and run migrations + hypothesis and agents seeds (one command, from repo root)
	@$(MAKE) create-db 2>/dev/null || true
	@cd hypo-stage-backend && yarn seed

.PHONY: stop-dependencies
stop-dependencies: ## Stop and remove Docker dependencies and volumes
	docker-compose down --volumes

