.PHONY: setup start build test lint clean docker-dev docker-prod help

help: ## Show this help menu
	@echo "Usage: make [TARGET]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies
	@echo "Installing dependencies..."
	@npm install

start: ## Start development servers
	@echo "Starting development servers..."
	@npm start

build: ## Build for production
	@echo "Building for production..."
	@npm run build

test: ## Run tests
	@echo "Running tests..."
	@npm test

lint: ## Run linter
	@echo "Running linter..."
	@npm run lint

clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	@npm run clean

docker-dev: ## Start development environment with Docker
	@echo "Starting development environment with Docker..."
	@npm run docker:up

docker-prod: ## Start production environment with Docker
	@echo "Starting production environment with Docker..."
	@docker-compose -f docker-compose.prod.yml up -d

docker-stop: ## Stop Docker containers
	@echo "Stopping Docker containers..."
	@docker-compose down 