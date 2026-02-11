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
test: ## Run all tests (frontend and backend)
	yarn test

##@ Lint

.PHONY: lint
lint: ## Run lint (code style) on both plugins
	yarn lint

##@ Validation

.PHONY: validate
validate: deps build test lint ## Install, build, test and lint (full validation)

##@ Docker (generic Backstage)

.PHONY: start-dependencies
start-dependencies: ## Start Docker dependencies (PostgreSQL for HypoStage backend)
	docker-compose up -d

.PHONY: stop-dependencies
stop-dependencies: ## Stop and remove Docker dependencies and volumes
	docker-compose down --volumes
