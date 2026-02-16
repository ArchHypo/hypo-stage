# HypoStage plugin – Makefile for build, test, lint and Docker dependencies.
# Use Node.js 20+ (e.g. nvm use 20).

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
build: ## Build both frontend and backend plugins (declarations + Backstage CLI build)
	yarn build

##@ Tests

.PHONY: test
test: ## Run all tests (frontend and backend), non-interactive
	CI=true yarn test

##@ Lint

.PHONY: lint
lint: ## Run lint (code style) on both plugins
	yarn lint

##@ Run all

.PHONY: check
check: ## Build, test, and lint in one go (non-interactive)
	@tmpdir=$$(mktemp -d); build_log="$$tmpdir/build.log"; test_log="$$tmpdir/test.log"; lint_log="$$tmpdir/lint.log"; failed=0; \
	echo ""; echo "=== Build ==="; \
	start=$$(date +%s); $(MAKE) build 2>&1 | tee "$$build_log"; build_ret=$$?; end=$$(date +%s); build_duration=$$((end-start)); \
	if [ $$build_ret -eq 0 ]; then echo "Build: OK ($${build_duration}s)"; else echo "Build: FAILED"; failed=1; fi; \
	echo ""; echo "=== Test ==="; \
	$(MAKE) test 2>&1 | tee "$$test_log"; test_ret=$$?; \
	if [ $$test_ret -eq 0 ]; then \
	  test_suites=$$(grep "Test Suites:" "$$test_log" | tail -1); test_tests=$$(grep "Tests:" "$$test_log" | tail -1); \
	  echo "Test: OK ($$test_suites; $$test_tests)"; \
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
	if [ $$test_ret -eq 0 ]; then echo "  Test:   passed ($$test_suites; $$test_tests)"; else echo "  Test:   FAILED"; fi; \
	if [ $$lint_ret -eq 0 ]; then echo "  Lint:   passed$$([ -n "$$lint_line" ] && echo " ($$lint_line)" || true)"; else echo "  Lint:   FAILED"; fi; \
	echo ""; \
	if [ $$failed -eq 0 ]; then echo "All steps passed."; else echo "One or more steps failed."; fi; \
	rm -rf "$$tmpdir"; [ $$failed -eq 0 ] || exit 1

##@ Docker (generic Backstage)

.PHONY: start-dependencies
start-dependencies: ## Start Docker dependencies (PostgreSQL for HypoStage backend)
	docker-compose up -d

.PHONY: stop-dependencies
stop-dependencies: ## Stop and remove Docker dependencies and volumes
	docker-compose down --volumes
